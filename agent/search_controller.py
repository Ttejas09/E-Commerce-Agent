"""Lazy Search Controller with signature caching, budget cap, and relaxation ladder."""

import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

_AGENT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AGENT_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

try:
    from agent.filters import FilterState
    from agent.config import MAX_SEARCHES, PRICE_AROUND_MARGIN
    from agent.catalogue_index import BRAND_CATEGORIES
except (ImportError, ModuleNotFoundError):
    from filters import FilterState
    from config import MAX_SEARCHES, PRICE_AROUND_MARGIN
    from catalogue_index import BRAND_CATEGORIES


class SearchController:
    """Controls search execution, caching, budget enforcement, and fallback relaxation."""

    def __init__(self, tools, max_searches: int = MAX_SEARCHES):
        self.tools = tools
        self.max_searches = max_searches
        self.searches_used = 0
        self.cache: Dict[Tuple, List[Dict[str, Any]]] = {}
        self.last_search_signature: Optional[Tuple] = None
        self.last_results: List[Dict[str, Any]] = []

    @property
    def searches_remaining(self) -> int:
        return max(0, self.max_searches - self.searches_used)

    def should_search(
        self,
        state: FilterState,
        has_closure: bool = False,
        in_cooldown: bool = False,
    ) -> bool:
        """Search gate: decides whether to fire a speculative search."""
        if self.searches_used >= self.max_searches:
            return False
        if in_cooldown:
            return False

        if state.num_filters() < 3 or state.category is None:
            return False

        if not has_closure:
            return False

        sig = state.get_signature()
        if sig in self.cache:
            return False

        return True

    def search(self, state: FilterState, residual_query: str = "") -> List[Dict[str, Any]]:
        """Run search with current filter state and residual query."""
        sig = state.get_signature()
        if sig in self.cache:
            self.last_results = self.cache[sig]
            return self.last_results

        if self.searches_used >= self.max_searches:
            return self.last_results

        filters = state.get_search_filters()
        results = self.tools.search(query=residual_query, filters=filters, k=10)
        self.searches_used += 1

        # Post-filter against any active negative exclusions (e.g. 'not black')
        if state.excluded and results:
            results = [p for p in results if not state.is_excluded(p)]

        self.cache[sig] = results
        self.last_search_signature = sig
        self.last_results = results
        return results

    def search_with_relaxation(
        self, state: FilterState, residual_query: str = ""
    ) -> List[Dict[str, Any]]:
        """Relaxation ladder when exact search returns 0 results.
        Allows up to 8 searches at finish() to ensure a product is found.
        """
        finish_budget = 8
        filters = state.get_search_filters()

        def _exec_search(q: str, f: dict) -> List[Dict[str, Any]]:
            if self.searches_used >= finish_budget:
                return []
            h = self.tools.search(query=q, filters=f, k=10)
            self.searches_used += 1
            if state.excluded and h:
                h = [p for p in h if not state.is_excluded(p)]
            return h

        # Check catalogue incompatibility: if brand doesn't make category, drop brand immediately
        b = str(filters.get("brand", "")).lower()
        c = str(filters.get("category", "")).lower()
        if b and c and b in BRAND_CATEGORIES:
            if c not in BRAND_CATEGORIES[b]:
                # Brand is incompatible with category! Drop brand first!
                f_no_b = dict(filters)
                f_no_b.pop("brand", None)
                hits = _exec_search(residual_query, f_no_b)
                if hits:
                    return hits

        # Step 1: Drop residual query
        if residual_query:
            hits = _exec_search("", filters)
            if hits:
                return hits

        # Step 2: Relax max_price +15%
        if "max_price" in filters:
            relaxed_filters = dict(filters)
            relaxed_filters["max_price"] = int(relaxed_filters["max_price"] * (1.0 + PRICE_AROUND_MARGIN))
            hits = _exec_search("", relaxed_filters)
            if hits:
                return hits

        # Step 3: Drop brand
        if "brand" in filters:
            f3 = dict(filters)
            f3.pop("brand", None)
            hits = _exec_search("", f3)
            if hits:
                return hits

        # Step 4: Drop colour
        if "colour" in filters:
            f4 = dict(filters)
            f4.pop("brand", None)
            f4.pop("colour", None)
            hits = _exec_search("", f4)
            if hits:
                return hits

        # Step 5: Keep only category + size
        if "category" in filters:
            f5 = {"category": filters["category"]}
            if "size" in filters:
                f5["size"] = filters["size"]
            hits = _exec_search("", f5)
            if hits:
                return hits

        # Step 6: Fallback to category + residual query
        if "category" in filters:
            hits = _exec_search(residual_query, {"category": filters["category"]})
            if hits:
                return hits

        return self.last_results
