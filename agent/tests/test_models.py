"""Unit and regression tests for the 3 Machine Learning Models:
- Model 1: Dense Semantic Retrieval
- Model 2: Sequence Token Slot Tagger
- Model 3: Calibrated Commit Gate Classifier
"""

import time
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
from agent.models.model_registry import (
    load_model1_dense,
    dense_semantic_search,
    load_model2_tagger,
    predict_slots_with_model2,
    load_model3_gate,
    evaluate_commit_with_model3,
)


class TestMachineLearningModels(unittest.TestCase):
    """Test verification for the 3 competition-compliant ML models."""

    @classmethod
    def setUpClass(cls):
        # Warm up models
        load_model1_dense()
        load_model2_tagger()
        load_model3_gate()

    def test_model1_dense_semantic_search(self):
        """Test Model 1 semantic retrieval over 1,074 products."""
        emb, meta = load_model1_dense()
        self.assertIsNotNone(emb)
        self.assertEqual(emb.shape, (1074, 128))

        # Query with semantic 'vibe' terms
        hits = dense_semantic_search("cozy warm bomber jacket", {"category": "jackets"}, k=5)
        self.assertTrue(len(hits) > 0)
        self.assertEqual(hits[0]["category"], "jackets")
        self.assertIn("score", hits[0])

        # Benchmark latency (< 5ms)
        t0 = time.perf_counter()
        _ = dense_semantic_search("black running shoes under 4000", k=5)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        self.assertLess(elapsed_ms, 5.0, f"Model 1 inference took {elapsed_ms:.2f}ms, expected < 5ms")

    def test_model2_slot_tagger_directional_prices(self):
        """Test Model 2 BIO slot tagger for directional price bounds."""
        bundle = load_model2_tagger()
        self.assertIsNotNone(bundle)

        # 1. Min price test ("above 5000")
        slots_min = predict_slots_with_model2("black sneakers above 5000".split())
        self.assertEqual(slots_min.get("category"), "sneakers")
        self.assertEqual(slots_min.get("colour"), "black")
        self.assertEqual(slots_min.get("min_price"), 5000)

        # 2. Max price test ("under 3000")
        slots_max = predict_slots_with_model2("kudova running shoes under 3000".split())
        self.assertEqual(slots_max.get("brand"), "kudova")
        self.assertEqual(slots_max.get("category"), "running shoes")
        self.assertEqual(slots_max.get("max_price"), 3000)

        # 3. Price range test ("between 2000 and 4000")
        slots_range = predict_slots_with_model2("jacket between 2000 and 4000".split())
        self.assertEqual(slots_range.get("min_price"), 2000)
        self.assertEqual(slots_range.get("max_price"), 4000)

        # Benchmark latency (< 3ms)
        t0 = time.perf_counter()
        _ = predict_slots_with_model2("urbanyx denim jacket size m under 2500".split())
        elapsed_ms = (time.perf_counter() - t0) * 1000
        self.assertLess(elapsed_ms, 3.0, f"Model 2 inference took {elapsed_ms:.2f}ms, expected < 3ms")

    def test_model3_calibrated_commit_gate(self):
        """Test Model 3 early commit calibrated probability output."""
        gate = load_model3_gate()
        self.assertIsNotNone(gate)

        slots = {"category": "sneakers", "colour": "black", "brand": "kudova", "size": "8"}

        # High confidence scenario (single candidate, structural closure, no cooldown)
        prob_high = evaluate_commit_with_model3(
            dense_sim1=0.88,
            dense_sim2=0.30,
            candidate_count=1,
            slots=slots,
            in_cooldown=False,
            has_closure=True,
            word_idx=5
        )
        self.assertGreater(prob_high, 0.90)

        # Low confidence scenario (in cooldown or multiple candidates)
        prob_low = evaluate_commit_with_model3(
            dense_sim1=0.55,
            dense_sim2=0.52,
            candidate_count=4,
            slots=slots,
            in_cooldown=True,
            has_closure=False,
            word_idx=3
        )
        self.assertLess(prob_low, 0.60)

        # Benchmark latency (< 3ms)
        t0 = time.perf_counter()
        _ = evaluate_commit_with_model3(0.8, 0.4, 1, slots, False, True, 4)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        self.assertLess(elapsed_ms, 3.0, f"Model 3 inference took {elapsed_ms:.2f}ms, expected < 3ms")


if __name__ == "__main__":
    unittest.main()
