"""Anticipatory Commerce Agent implementation compatible with evaluate.py."""

import sys
from pathlib import Path

# Ensure both repo root and agent/ are in sys.path
_AGENT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AGENT_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

try:
    from agent.catalogue_index import (
        CATEGORIES, BRANDS, BRANDS_LOWER, COLOURS, ALL_SIZES, CATEGORY_SIZES
    )
    from agent.extractor import IncrementalExtractor
    from agent.search_controller import SearchController
    from agent.confidence import ConfidenceEngine
    from agent.config import COMMIT_THRESHOLD, MAX_SEARCHES
except (ImportError, ModuleNotFoundError):
    from catalogue_index import (
        CATEGORIES, BRANDS, BRANDS_LOWER, COLOURS, ALL_SIZES, CATEGORY_SIZES
    )
    from extractor import IncrementalExtractor
    from search_controller import SearchController
    from confidence import ConfidenceEngine
    from config import COMMIT_THRESHOLD, MAX_SEARCHES

from typing import Optional, Dict, Any


class Agent:
    """Anticipatory shopping agent that predicts shopper filters from streaming words."""

    def __init__(self, tools):
        self.tools = tools
        self.confidence_engine = ConfidenceEngine(commit_threshold=COMMIT_THRESHOLD)

    def start(self, request_id: str) -> None:
        """Start a new request."""
        self.request_id = request_id
        self.extractor = IncrementalExtractor()
        self.search_ctrl = SearchController(self.tools, max_searches=MAX_SEARCHES)
        self.word_index = 0
        self.has_committed = False
        self.committed_product_id: Optional[str] = None
        self.commit_filters_snapshot: Optional[Dict[str, Any]] = None

    def observe(self, word: str) -> Optional[Dict[str, Any]]:
        """Observe one more incoming word. Return None or dict."""
        self.word_index += 1
        state = self.extractor.process_word(word, self.word_index)
        has_closure = self.extractor.has_closure_cue()
        in_cooldown = self.extractor.is_in_cooldown(self.word_index)

        commit_id: Optional[str] = None
        confidence = 0.5

        if self.search_ctrl.should_search(state, has_closure, in_cooldown):
            residual = self.extractor.get_residual_query()
            results = self.search_ctrl.search(state, residual)

            if results:
                margin = 0.0
                if len(results) >= 2:
                    margin = results[0].get("score", 0) - results[1].get("score", 0)

                confidence = self.confidence_engine.compute_confidence(
                    result_count=len(results),
                    top1_score_margin=margin,
                    num_filters=state.num_filters(),
                    has_category=state.category is not None,
                    has_brand=state.brand is not None,
                    has_size=state.size is not None,
                    has_colour=state.colour is not None,
                    has_price=(state.max_price is not None or state.min_price is not None),
                    word_index=self.word_index,
                    words_since_last_slot_change=self.extractor.words_since_last_slot_change,
                    correction_seen=self.extractor.correction_seen,
                    in_cooldown=in_cooldown,
                    has_closure=has_closure,
                    is_code_mixed=self.extractor.is_code_mixed,
                )

                if self.confidence_engine.should_commit(
                    confidence=confidence,
                    result_count=len(results),
                    in_cooldown=in_cooldown,
                    has_committed=self.has_committed,
                    has_closure=has_closure,
                ):
                    self.has_committed = True
                    self.committed_product_id = results[0]["product_id"]
                    self.commit_filters_snapshot = dict(state.get_search_filters())
                    commit_id = self.committed_product_id

        out = {
            "filters": state.get_search_filters(),
            "confidence": confidence,
        }
        if commit_id:
            out["commit"] = commit_id

        return out

    def finish(self) -> Optional[str]:
        """Finish the request and return the final predicted product_id."""
        self.extractor.flush()
        state = self.extractor.state

        # If we already committed and core filters have not changed since commit,
        # return the committed product directly without burning a redundant search!
        if self.has_committed and self.committed_product_id:
            current_filters = state.get_search_filters()
            if current_filters == self.commit_filters_snapshot:
                return self.committed_product_id

        residual = self.extractor.get_residual_query()

        results = self.search_ctrl.search(state, residual)
        if results:
            return results[0]["product_id"]

        relaxed_results = self.search_ctrl.search_with_relaxation(state, residual)
        if relaxed_results:
            return relaxed_results[0]["product_id"]

        return self.committed_product_id
