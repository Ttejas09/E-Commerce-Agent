"""Unit tests for correction handling."""

import unittest
from agent.extractor import IncrementalExtractor


class TestCorrections(unittest.TestCase):
    def test_explicit_size_correction(self):
        sentence = "show me maroon size M oops XS Tanaro kurta max 1500"
        ext = IncrementalExtractor()
        for idx, word in enumerate(sentence.split(), 1):
            ext.process_word(word, idx)
        self.assertEqual(ext.state.size.value, "XS")
        self.assertTrue(ext.correction_seen)

    def test_explicit_colour_correction(self):
        sentence = "hey do you have any black oops grey size M hooded sweatshirt by Urbanyx"
        ext = IncrementalExtractor()
        for idx, word in enumerate(sentence.split(), 1):
            ext.process_word(word, idx)
        self.assertEqual(ext.state.colour.value, "grey")
        self.assertTrue(ext.correction_seen)

    def test_make_that_correction(self):
        sentence = "I need yellow size L make that XXL tee not more than seven hundred"
        ext = IncrementalExtractor()
        for idx, word in enumerate(sentence.split(), 1):
            ext.process_word(word, idx)
        self.assertEqual(ext.state.size.value, "XXL")
        self.assertTrue(ext.correction_seen)

    def test_sorry_meant_correction(self):
        sentence = "slides in black size 8 UK sorry size 7 UK budget 700"
        ext = IncrementalExtractor()
        for idx, word in enumerate(sentence.split(), 1):
            ext.process_word(word, idx)
        self.assertEqual(ext.state.size.value, "7")
        self.assertTrue(ext.correction_seen)

    def test_actually_make_it_brand_correction(self):
        sentence = "casual sneakers by Pacevo in navy blue UK 10 actually make it Kudova"
        ext = IncrementalExtractor()
        for idx, word in enumerate(sentence.split(), 1):
            ext.process_word(word, idx)
        self.assertEqual(ext.state.brand.value, "Kudova")
        self.assertTrue(ext.correction_seen)


if __name__ == "__main__":
    unittest.main()
