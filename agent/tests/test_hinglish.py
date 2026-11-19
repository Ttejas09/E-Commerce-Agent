"""Unit tests for Hinglish normalization and extraction."""

import unittest
from agent.extractor import IncrementalExtractor


class TestHinglish(unittest.TestCase):
    def test_hindi_numbers_and_fractions(self):
        cases = [
            ("mujhe Loomsy casual shoes size eight chahiye", "8"),
            ("Pacevo running shoes das number milega", "10"),
        ]
        for sentence, expected_size in cases:
            ext = IncrementalExtractor()
            for idx, word in enumerate(sentence.split(), 1):
                ext.process_word(word, idx)
            self.assertEqual(ext.state.size.value, expected_size)

    def test_hindi_prices(self):
        cases = [
            ("Urbanyx jacket budget saadhe teen hazaar", 3500),
            ("Mehrin dress saadhe teen hazaar tak", 3500),
            ("Northweft denims pandrah sau se kam", 1500),
            ("Zentrail joggers satrah sau ke andar", 1700),
            ("Urbanyx jacket dhai hazaar tak chahiye", 2500),
            ("Tikkra wrist watch paanch hazaar tak", 5000),
        ]
        for sentence, expected_price in cases:
            ext = IncrementalExtractor()
            for idx, word in enumerate(sentence.split(), 1):
                ext.process_word(word, idx)
            self.assertEqual(ext.state.max_price.value, expected_price, f"Failed for '{sentence}'")

    def test_hindi_colours(self):
        cases = [
            ("mujhe kaala jacket chahiye", "black"),
            ("safed kurta dikhao", "white"),
            ("neela jogging shoes", "blue"),
            ("laal t shirt large", "red"),
            ("gulabi Mehrin dress", "pink"),
            ("in bhura paanch hazaar tak", "brown"),
        ]
        for sentence, expected_colour in cases:
            ext = IncrementalExtractor()
            for idx, word in enumerate(sentence.split(), 1):
                ext.process_word(word, idx)
            self.assertEqual(ext.state.colour.value, expected_colour, f"Failed for '{sentence}'")


if __name__ == "__main__":
    unittest.main()
