"""Calibrated Confidence Engine and Commit Policy for Anticipatory Commerce."""

import sys
from pathlib import Path

_AGENT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AGENT_DIR.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

try:
    from agent.config import COMMIT_THRESHOLD, CORRECTION_COOLDOWN
except (ImportError, ModuleNotFoundError):
    from config import COMMIT_THRESHOLD, CORRECTION_COOLDOWN

from typing import Optional


class ConfidenceEngine:
    """Computes calibrated confidence and evaluates commit safety gates."""

    def __init__(self, commit_threshold: float = COMMIT_THRESHOLD):
        self.commit_threshold = commit_threshold

    def compute_confidence(
        self,
        result_count: int,
        top1_score_margin: float = 0.0,
        num_filters: int = 0,
        has_category: bool = False,
        has_brand: bool = False,
        has_size: bool = False,
        has_colour: bool = False,
        has_price: bool = False,
        word_index: int = 1,
        words_since_last_slot_change: int = 0,
        correction_seen: bool = False,
        in_cooldown: bool = False,
        has_closure: bool = False,
        is_code_mixed: bool = False,
    ) -> float:
        """Compute calibrated probability P(top1 == target | state)."""
        if result_count == 0:
            return 0.0

        if result_count == 1:
            base = 0.95
        elif result_count <= 3:
            base = 0.60 + min(top1_score_margin * 0.05, 0.20)
        else:
            base = 0.30 + min(top1_score_margin * 0.03, 0.15)

        bonus = num_filters * 0.01
        if has_category:
            bonus += 0.02
        if has_size:
            bonus += 0.01
        if has_colour:
            bonus += 0.01

        conf = base + bonus

        if has_closure:
            conf += 0.03

        if words_since_last_slot_change >= 2:
            conf += 0.01

        if in_cooldown:
            conf -= 0.35
        elif correction_seen:
            conf -= 0.05

        if is_code_mixed:
            conf -= 0.02

        return max(0.0, min(1.0, conf))

    def should_commit(
        self,
        confidence: float,
        result_count: int,
        in_cooldown: bool,
        has_committed: bool,
        has_closure: bool,
    ) -> bool:
        """Strict safety guards: all must pass before emitting a speculative commit."""
        if has_committed:
            return False
        if in_cooldown:
            return False
        if result_count != 1:
            return False
        if not has_closure:
            return False
        if confidence < self.commit_threshold:
            return False

        return True
