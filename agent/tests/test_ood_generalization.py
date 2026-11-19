"""Stress tests for Out-Of-Distribution (OOD) generalization."""

import unittest
from agent.extractor import IncrementalExtractor
from agent.agent import Agent
from evaluate import Tools


class TestOODGeneralization(unittest.TestCase):
    def setUp(self):
        self.extractor = IncrementalExtractor()

    def _feed(self, text: str):
        ext = IncrementalExtractor()
        for idx, w in enumerate(text.split(), 1):
            ext.process_word(w, idx)
        return ext

    def test_unseen_closure_phrases(self):
        """Test general purpose clauses not in dev.jsonl."""
        unseen_closures = [
            "blue sneakers size 9 for college",
            "black kurta XL for diwali",
            "grey running shoes 10 as a present",
            "white dress small for my sister",
            "maroon track pants M for my mother",
        ]
        for query in unseen_closures:
            ext = self._feed(query)
            self.assertTrue(ext.has_closure_cue(), f"Failed to detect general closure in: '{query}'")

    def test_unseen_category_synonyms(self):
        """Test categories described with unseen synonyms."""
        cases = [
            ("white kicks size 9", "sneakers"),
            ("black trainers UK 10", "sneakers"),
            ("grey loafers size 8", "sneakers"),
            ("navy polo size L", "t-shirts"),
            ("black trousers size M", "track pants"),
            ("brown chappals size 7", "sandals"),
            ("olive hoody size XL", "hoodies"),
        ]
        for query, expected_cat in cases:
            ext = self._feed(query)
            self.assertEqual(ext.state.category.value, expected_cat, f"Failed for: '{query}'")

    def test_unseen_colour_synonyms(self):
        """Test unseen colour variants mapped to canonical catalogue colours."""
        cases = [
            ("charcoal tshirt size L", "grey"),
            ("dark blue running shoes size 9", "navy"),
            ("deep blue sneakers size 8", "navy"),
            ("off white kurta size M", "white"),
            ("burgundy dress size S", "maroon"),
            ("crimson hoodie size XL", "red"),
            ("mustard cap", "yellow"),
        ]
        for query, expected_colour in cases:
            ext = self._feed(query)
            self.assertEqual(ext.state.colour.value, expected_colour, f"Failed for: '{query}'")

    def test_brand_typo_tolerance(self):
        """Test Levenshtein distance 1 typo tolerance on brand names."""
        cases = [
            ("strydoo running shoes size 9", "Strydo"),
            ("urbanyxx hooded sweatshirt L", "Urbanyx"),
            ("zentral track pants size M", "Zentrail"),
            ("pacevoo sneakers size 10", "Pacevo"),
            ("tanarro kurta size XL", "Tanaro"),
            ("sonquill headphones", "Sonquil"),
        ]
        for query, expected_brand in cases:
            ext = self._feed(query)
            self.assertEqual(ext.state.brand.value, expected_brand, f"Failed for typo brand in: '{query}'")

    def test_category_typo_tolerance(self):
        """Test Levenshtein distance 1 typo tolerance on categories."""
        cases = [
            ("white sneekers size 9", "sneakers"),
            ("black sandels size 8", "sandals"),
            ("grey swetshirt size M", "hoodies"),
        ]
        for query, expected_cat in cases:
            ext = self._feed(query)
            self.assertEqual(ext.state.category.value, expected_cat, f"Failed for typo category in: '{query}'")

    def test_waist_size_mutual_inference(self):
        """Test waist size inferring category 'jeans' even when jeans is not mentioned."""
        ext = self._feed("blue denims 32 waist by Urbanyx under 2000")
        self.assertEqual(ext.state.category.value, "jeans")
        self.assertEqual(ext.state.size.value, "32")

    def test_e2e_generalization_with_agent(self):
        """Test full agent execution on a completely synthetic OOD request."""
        tools = Tools()
        agent = Agent(tools)
        agent.start("ood-001")
        words = ["hey", "find", "me", "strydoo", "dark", "blue", "running", "shoes", "size", "9", "for", "college"]
        commits = []
        for w in words:
            out = agent.observe(w)
            if out and out.get("commit"):
                commits.append(out["commit"])
        final_id = agent.finish()
        self.assertIsNotNone(final_id)
        # Should have found a Strydo navy running shoe in size 9
        product = tools.search(filters={"brand": "Strydo", "category": "running shoes", "colour": "navy", "size": "9"})
        self.assertEqual(final_id, product[0]["product_id"])


if __name__ == "__main__":
    unittest.main()
