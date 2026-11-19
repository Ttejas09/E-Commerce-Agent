"""Adversarial stress testing against challenging unseen query patterns."""

import unittest
from agent.agent import Agent
from evaluate import Tools

TEST_CASES = [
    # 1. Negative constraints
    {
        "id": "adv-neg-1",
        "text": "running shoes size 9 under 5000 not black Pacevo",
        "expected_filters": {"category": "running shoes", "size": "9", "brand": "Pacevo"}
    },
    # 2. Double corrections
    {
        "id": "adv-corr-2",
        "text": "Strydo running shoes size 7 wait size 8 actually size 9 in navy blue",
        "expected_filters": {"brand": "Strydo", "category": "running shoes", "size": "9", "colour": "navy"}
    },
    {
        "id": "adv-corr-3",
        "text": "show me black no wait blue make that red Pacevo sneakers size 10",
        "expected_filters": {"colour": "red", "brand": "Pacevo", "category": "sneakers", "size": "10"}
    },
    # 3. Conversational filler and unusual word orders
    {
        "id": "adv-filler-1",
        "text": "um like you know I really need something like Urbanyx black jacket size L",
        "expected_filters": {"brand": "Urbanyx", "colour": "black", "category": "jackets", "size": "L"}
    },
    {
        "id": "adv-order-1",
        "text": "size 10 UK blue running shoes from Pacevo under 5000 please",
        "expected_filters": {"size": "10", "colour": "blue", "category": "running shoes", "brand": "Pacevo", "max_price": 5000}
    },
    # 4. Range and budget expressions
    {
        "id": "adv-price-1",
        "text": "Tanaro kurta between 1000 and 1500 in maroon size M",
        "expected_filters": {"brand": "Tanaro", "category": "kurtas", "colour": "maroon", "size": "M"}
    },
    {
        "id": "adv-price-2",
        "text": "Sonquil headphones around 7k in blue for my sister",
        "expected_filters": {"brand": "Sonquil", "category": "headphones", "colour": "blue"}
    },
    # 5. Brand and category typos
    {
        "id": "adv-typo-1",
        "text": "strydoo green running sneekers size 9 under 6000",
        "expected_filters": {"brand": "Strydo", "colour": "green", "category": "running shoes", "size": "9", "max_price": 6000}
    },
    {
        "id": "adv-typo-2",
        "text": "urbanyxx black sandels size 7 budget 800",
        "expected_filters": {"brand": "Urbanyx", "colour": "black", "category": "sandals", "size": "7", "max_price": 800}
    },
    # 6. Unseen Hinglish phrasings
    {
        "id": "adv-hi-1",
        "text": "mujhe ek badhiya sa Loomsy safed kurta chahiye size XL do hazaar tak",
        "expected_filters": {"brand": "Loomsy", "colour": "white", "category": "kurtas", "size": "XL", "max_price": 2000}
    },
    {
        "id": "adv-hi-2",
        "text": "kya aapke paas kaala joota hai Kudova brand aath number",
        "expected_filters": {"colour": "black", "category": "sneakers", "brand": "Kudova", "size": "8"}
    },
    # 7. Blunt abrupt ending (no closure words whatsoever)
    {
        "id": "adv-blunt-1",
        "text": "black Pacevo running shoes size 9 4000",
        "expected_filters": {"colour": "black", "brand": "Pacevo", "category": "running shoes", "size": "9", "max_price": 4000}
    },
    # 8. Unseen synonyms
    {
        "id": "adv-syn-1",
        "text": "Pacevo charcoal polo size XL under 1000",
        "expected_filters": {"brand": "Pacevo", "colour": "grey", "category": "t-shirts", "size": "XL", "max_price": 1000}
    },
    {
        "id": "adv-syn-2",
        "text": "dark blue kicks size 9 by Kudova",
        "expected_filters": {"colour": "navy", "category": "sneakers", "size": "9", "brand": "Kudova"}
    },
    # 9. Waist size only without category
    {
        "id": "adv-waist-1",
        "text": "Urbanyx in blue 32 waist max 2000 for college",
        "expected_filters": {"brand": "Urbanyx", "colour": "blue", "size": "32", "category": "jeans", "max_price": 2000}
    }
]


class TestAdversarialInputs(unittest.TestCase):
    def setUp(self):
        self.tools = Tools()

    def test_all_adversarial_cases(self):
        for tc in TEST_CASES:
            agent = Agent(self.tools)
            agent.start(tc["id"])
            for w in tc["text"].split():
                agent.observe(w)
            final_id = agent.finish()
            self.assertIsNotNone(final_id, f"Agent returned None for: '{tc['text']}'")

            extracted = agent.extractor.state.get_search_filters()
            expected = tc["expected_filters"]
            for k, v in expected.items():
                ext_val = str(extracted.get(k)).lower() if extracted.get(k) is not None else None
                exp_val = str(v).lower()
                self.assertEqual(ext_val, exp_val, f"Mismatch in {k} for '{tc['text']}' (got {ext_val}, expected {exp_val})")


if __name__ == "__main__":
    unittest.main()
