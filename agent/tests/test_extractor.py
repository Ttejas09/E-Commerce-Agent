"""Unit tests for the IncrementalExtractor."""

import unittest
from agent.extractor import IncrementalExtractor


class TestIncrementalExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = IncrementalExtractor()

    def _feed_words(self, sentence: str):
        words = sentence.split()
        for idx, word in enumerate(words, 1):
            self.extractor.process_word(word, idx)
        return self.extractor.state

    def test_basic_slot_extraction(self):
        state = self._feed_words("I want Loomsy navy blue casual sneakers within forty five hundred size 7")
        filters = state.get_search_filters()
        self.assertEqual(filters.get("category"), "sneakers")
        self.assertEqual(filters.get("colour"), "navy")
        self.assertEqual(filters.get("brand"), "Loomsy")
        self.assertEqual(filters.get("max_price"), 4500)
        self.assertEqual(filters.get("size"), "7")

    def test_multi_word_categories(self):
        cases = [
            ("black running shoes size 9", "running shoes"),
            ("grey track pants size L", "track pants"),
            ("olive hooded sweatshirt size M", "hoodies"),
            ("pair of jeans 32 waist", "jeans"),
            ("wrist watch in silver", "watches"),
            ("t shirt in red", "t-shirts"),
            ("bag pack by Carrafel", "backpacks"),
        ]
        for sentence, expected_cat in cases:
            ext = IncrementalExtractor()
            for idx, word in enumerate(sentence.split(), 1):
                ext.process_word(word, idx)
            self.assertEqual(ext.state.category.value, expected_cat, f"Failed for '{sentence}'")

    def test_multi_word_brands(self):
        state = self._feed_words("maroon kurta Kesar Loom brand for under 2,600")
        self.assertEqual(state.brand.value, "Kesar Loom")

    def test_price_formats(self):
        cases = [
            ("under 4k", 4000),
            ("less than 0.8k", 800),
            ("budget 1.5k", 1500),
            ("up to ₹1500", 1500),
            ("under 7,500", 7500),
            ("below one thousand five hundred", 1500),
            ("max twenty three hundred", 2300),
            ("within thirty seven hundred", 3700),
            ("not more than seven hundred", 700),
        ]
        for sentence, expected_price in cases:
            ext = IncrementalExtractor()
            for idx, word in enumerate(sentence.split(), 1):
                ext.process_word(word, idx)
            self.assertEqual(ext.state.max_price.value, expected_price, f"Failed for '{sentence}'")

    def test_size_disambiguation(self):
        cases = [
            ("size 8 UK", "8"),
            ("UK 10", "10"),
            ("32 waist", "32"),
            ("waist 28", "28"),
            ("extra large", "XL"),
            ("small", "S"),
            ("double XL", "XXL"),
            ("medium", "M"),
        ]
        for sentence, expected_size in cases:
            ext = IncrementalExtractor()
            for idx, word in enumerate(sentence.split(), 1):
                ext.process_word(word, idx)
            self.assertEqual(ext.state.size.value, expected_size, f"Failed for '{sentence}'")


if __name__ == "__main__":
    unittest.main()
