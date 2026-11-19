"""Unit tests for v2 enhancements: speech homophones, negation filtering, extended synonyms, and dynamic indexing."""

import unittest
from agent.extractor import IncrementalExtractor
from agent.agent import Agent
from agent.search_controller import SearchController
from agent.filters import FilterState
from evaluate import Tools


class TestV2Enhancements(unittest.TestCase):

    def test_speech_homophones(self):
        """Speech recognition acoustic homophones (ate -> 8, etc.)."""
        extractor = IncrementalExtractor()
        words = ["I", "need", "black", "running", "shoes", "size", "ate", "please"]
        for idx, w in enumerate(words, 1):
            state = extractor.process_word(w, idx)
        self.assertEqual(state.size.value, "8")

        extractor2 = IncrementalExtractor()
        words2 = ["show", "me", "sandals", "size", "seven", "by", "Urbanyx"]
        for idx, w in enumerate(words2, 1):
            state2 = extractor2.process_word(w, idx)
        self.assertEqual(state2.size.value, "7")

    def test_semantic_negation(self):
        """Negative constraints ('not black', 'except jeans') route to excluded."""
        extractor = IncrementalExtractor()
        words = ["running", "shoes", "size", "9", "under", "5000", "not", "black", "Pacevo"]
        for idx, w in enumerate(words, 1):
            state = extractor.process_word(w, idx)

        # Black must NOT be the target colour
        self.assertIsNone(state.colour)
        self.assertIn("black", state.excluded.get("colour", set()))
        self.assertEqual(state.category.value, "running shoes")
        self.assertEqual(state.size.value, "9")
        self.assertEqual(state.brand.value, "Pacevo")

    def test_negation_post_filtering_in_search(self):
        """Search controller drops products with excluded attributes."""
        tools = Tools()
        ctrl = SearchController(tools)
        state = FilterState()
        state.set_filter("category", "running shoes", 0.98, 1, ["test"])
        state.set_filter("brand", "Pacevo", 0.98, 2, ["test"])
        state.set_filter("size", "9", 0.98, 3, ["test"])
        state.set_filter("max_price", 5000, 0.98, 4, ["test"])
        state.exclude_filter("colour", "black")

        hits = ctrl.search(state, "")
        self.assertTrue(len(hits) > 0)
        # All returned products must NOT be black
        for h in hits:
            self.assertNotEqual(h.get("colour", "").lower(), "black")

    def test_extended_apparel_synonyms(self):
        """Extended slang and apparel synonyms."""
        extractor = IncrementalExtractor()
        words = ["Sonquil", "earphones", "in", "teal", "under", "7000"]
        for idx, w in enumerate(words, 1):
            state = extractor.process_word(w, idx)
        self.assertEqual(state.category.value, "headphones")
        self.assertEqual(state.colour.value, "blue")

        extractor2 = IncrementalExtractor()
        words2 = ["Urbanyx", "windbreaker", "in", "burgundy", "size", "L"]
        for idx, w in enumerate(words2, 1):
            state2 = extractor2.process_word(w, idx)
        self.assertEqual(state2.category.value, "jackets")
        self.assertEqual(state2.colour.value, "maroon")

        extractor3 = IncrementalExtractor()
        words3 = ["Strydo", "flip-flops", "size", "8", "under", "1000"]
        for idx, w in enumerate(words3, 1):
            state3 = extractor3.process_word(w, idx)
        self.assertEqual(state3.category.value, "sandals")

    def test_zero_search_waste_on_commit(self):
        """When an early commit is confirmed, finish() should not waste a search."""
        tools = Tools()
        agent = Agent(tools)
        agent.start("test-zero-waste")
        words = ["black", "Pacevo", "running", "shoes", "size", "9", "under", "4000", "please"]
        for w in words:
            agent.observe(w)
        self.assertTrue(agent.has_committed)
        final_id = agent.finish()
        self.assertEqual(final_id, agent.committed_product_id)
        # Exactly 1 search was used! Zero wasted searches!
        self.assertEqual(tools.searches, 1)


if __name__ == "__main__":
    unittest.main()
