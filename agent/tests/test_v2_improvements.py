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
        # Exactly 1 search was used! Zero wasted searches!
        self.assertEqual(tools.searches, 1)

    def test_material_and_style_modifiers_preservation(self):
        """Material/fabric modifiers (denim, corduroy, canvas) must not prematurely map or get stripped."""
        # 1. 'denim' alone must NOT trigger category: jeans
        ext1 = IncrementalExtractor()
        ext1.process_word("denim", 1)
        st1 = ext1.flush()
        self.assertIsNone(st1.category)
        self.assertEqual(ext1.get_residual_query(), "denim")

        # 2. 'denim jacket' -> category: jackets, residual: denim
        ext2 = IncrementalExtractor()
        for i, w in enumerate(["denim", "jacket"], 1):
            ext2.process_word(w, i)
        st2 = ext2.flush()
        self.assertEqual(st2.category.value, "jackets")
        self.assertEqual(ext2.get_residual_query(), "denim")

        # Agent returns actual denim jacket
        tools = Tools()
        agent = Agent(tools)
        agent.start("test-denim-jacket")
        for w in ["denim", "jacket"]:
            agent.observe(w)
        pid = agent.finish()
        self.assertIn(pid, ["P0722", "P0723", "P0724", "P0725"])

        # 3. 'denims' plural maps to jeans
        ext3 = IncrementalExtractor()
        ext3.process_word("denims", 1)
        st3 = ext3.flush()
        self.assertEqual(st3.category.value, "jeans")

        # 4. 'corduroy cap' -> category: caps, residual: corduroy
        ext4 = IncrementalExtractor()
        for i, w in enumerate(["corduroy", "cap"], 1):
            ext4.process_word(w, i)
        st4 = ext4.flush()
        self.assertEqual(st4.category.value, "caps")
        self.assertEqual(ext4.get_residual_query(), "corduroy")

    def test_price_direction_min_and_max(self):
        """Price directions ('above', 'over', 'more than' -> min_price; 'under', 'not more than' -> max_price)."""
        # 'above 6000' -> min_price: 6000
        ext = IncrementalExtractor()
        for i, w in enumerate("Urbanyx Denim jacket size S above 6000".split(), 1):
            ext.process_word(w, i)
        st = ext.flush()
        self.assertEqual(st.brand.value, "Urbanyx")
        self.assertEqual(st.category.value, "jackets")
        self.assertEqual(st.size.value, "S")
        self.assertEqual(st.min_price.value, 6000)
        self.assertIsNone(st.max_price)
        self.assertEqual(ext.get_residual_query(), "denim")

        # Full Agent search returns P0723 (Urbanyx Denim Jacket S Rs 6499)
        tools = Tools()
        agent = Agent(tools)
        agent.start("test-above-6000")
        for w in "Urbanyx Denim jacket size S above 6000".split():
            agent.observe(w)
        pid = agent.finish()
        self.assertEqual(pid, "P0723")

        # 'not more than 2500' -> max_price: 2500
        ext2 = IncrementalExtractor()
        for i, w in enumerate("shoes not more than 2500".split(), 1):
            ext2.process_word(w, i)
        st2 = ext2.flush()
        self.assertEqual(st2.max_price.value, 2500)
        self.assertIsNone(st2.min_price)

        # 'between 1000 and 3000' -> min_price: 1000, max_price: 3000
        ext3 = IncrementalExtractor()
        for i, w in enumerate("shirt between 1000 and 3000".split(), 1):
            ext3.process_word(w, i)
        st3 = ext3.flush()
        self.assertEqual(st3.min_price.value, 1000)
        self.assertEqual(st3.max_price.value, 3000)


if __name__ == "__main__":
    unittest.main()
