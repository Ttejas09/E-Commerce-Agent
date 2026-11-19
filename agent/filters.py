"""FilterValue and FilterState dataclasses for the e-commerce search agent."""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Optional, Union, List, Dict, Set

try:
    from agent.config import CORRECTION_COOLDOWN
except (ImportError, ModuleNotFoundError):
    from config import CORRECTION_COOLDOWN


@dataclass
class FilterValue:
    value: Union[str, int]
    confidence: float
    word_index: int
    provenance: List[str]
    source_lang: str = "en"
    superseded_by: Optional['FilterValue'] = None


@dataclass
class FilterState:
    category: Optional[FilterValue] = None
    colour: Optional[FilterValue] = None
    size: Optional[FilterValue] = None
    brand: Optional[FilterValue] = None
    max_price: Optional[FilterValue] = None
    min_price: Optional[FilterValue] = None
    excluded: Dict[str, Set[str]] = field(default_factory=dict)
    residual_tokens: List[str] = field(default_factory=list)
    version: int = 0
    last_correction_word: Optional[int] = None

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def get_search_filters(self) -> dict:
        """Return a dict of non-None filter slot values (raw values, not FilterValue)."""
        result: dict = {}
        for slot in ("category", "colour", "size", "brand", "max_price", "min_price"):
            fv: Optional[FilterValue] = getattr(self, slot)
            if fv is not None:
                result[slot] = fv.value
        return result

    def get_signature(self) -> tuple:
        """Hashable signature for cache-keying the current filter state."""
        def _val(slot: str):
            fv: Optional[FilterValue] = getattr(self, slot)
            return fv.value if fv is not None else None

        exc_sig = tuple(sorted((k, tuple(sorted(v))) for k, v in self.excluded.items()))
        return (
            _val("category"),
            _val("colour"),
            _val("size"),
            _val("brand"),
            _val("max_price"),
            _val("min_price"),
            tuple(sorted(self.residual_tokens)),
            exc_sig,
        )

    def exclude_filter(self, slot: str, value: str) -> None:
        """Add an excluded attribute value (e.g. for 'not black', 'except jeans')."""
        if slot not in self.excluded:
            self.excluded[slot] = set()
        self.excluded[slot].add(str(value).lower())

    def is_excluded(self, product: dict) -> bool:
        """Check if product matches any excluded slot value."""
        for slot, exc_vals in self.excluded.items():
            prod_val = str(product.get(slot, "")).lower()
            if prod_val and prod_val in exc_vals:
                return True
        return False

    def num_filters(self) -> int:
        """Count of non-None structured filter slots."""
        return sum(
            1
            for slot in ("category", "colour", "size", "brand", "max_price", "min_price")
            if getattr(self, slot) is not None
        )

    def set_filter(
        self,
        slot: str,
        value: Union[str, int],
        confidence: float,
        word_index: int,
        provenance: List[str],
        source_lang: str = "en",
    ) -> None:
        """Set a filter slot, detecting corrections automatically.

        If the slot already holds a value and the new write is far enough from
        the last correction word (beyond CORRECTION_COOLDOWN), it is treated as
        a correction: version is bumped and last_correction_word is recorded.
        """
        existing: Optional[FilterValue] = getattr(self, slot, None)
        new_fv = FilterValue(
            value=value,
            confidence=confidence,
            word_index=word_index,
            provenance=provenance,
            source_lang=source_lang,
        )

        if existing is not None:
            # Correction detection: same slot overwritten without conjunction context
            is_correction = True
            if (
                self.last_correction_word is not None
                and abs(word_index - self.last_correction_word) <= CORRECTION_COOLDOWN
            ):
                is_correction = False  # likely conjunction / refinement, not correction

            if is_correction:
                existing.superseded_by = new_fv
                self.version += 1
                self.last_correction_word = word_index

        setattr(self, slot, new_fv)

    def clone(self) -> "FilterState":
        """Return a deep copy of this FilterState."""
        return copy.deepcopy(self)
