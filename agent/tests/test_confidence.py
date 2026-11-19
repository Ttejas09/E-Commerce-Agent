"""Unit tests for ConfidenceEngine."""

import unittest
from agent.confidence import ConfidenceEngine


class TestConfidence(unittest.TestCase):
    def setUp(self):
        self.engine = ConfidenceEngine(commit_threshold=0.94)

    def test_unique_result_confidence(self):
        conf = self.engine.compute_confidence(
            result_count=1,
            num_filters=4,
            has_category=True,
            has_brand=True,
            has_size=True,
            has_colour=True,
            has_closure=True,
        )
        self.assertGreaterEqual(conf, 0.94)

    def test_multi_result_confidence_lower(self):
        conf = self.engine.compute_confidence(
            result_count=5,
            num_filters=2,
            has_category=True,
            has_brand=False,
            has_size=False,
            has_colour=True,
            has_closure=False,
        )
        self.assertLess(conf, 0.80)

    def test_commit_guards(self):
        # Passes all guards
        self.assertTrue(
            self.engine.should_commit(
                confidence=0.95,
                result_count=1,
                in_cooldown=False,
                has_committed=False,
                has_closure=True,
            )
        )
        # Blocked: result count > 1
        self.assertFalse(
            self.engine.should_commit(
                confidence=0.95,
                result_count=2,
                in_cooldown=False,
                has_committed=False,
                has_closure=True,
            )
        )
        # Blocked: in cooldown
        self.assertFalse(
            self.engine.should_commit(
                confidence=0.95,
                result_count=1,
                in_cooldown=True,
                has_committed=False,
                has_closure=True,
            )
        )
        # Blocked: already committed
        self.assertFalse(
            self.engine.should_commit(
                confidence=0.95,
                result_count=1,
                in_cooldown=False,
                has_committed=True,
                has_closure=True,
            )
        )


if __name__ == "__main__":
    unittest.main()
