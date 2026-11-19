"""Integration test with evaluate.py harness."""

import unittest
from agent.agent import Agent
from evaluate import Tools


class TestAgentIntegration(unittest.TestCase):
    def setUp(self):
        self.tools = Tools()
        self.agent = Agent(self.tools)

    def test_full_request_cycle(self):
        self.agent.start("test-001")
        words = ["hi,", "I", "want", "Loomsy", "navy", "blue", "casual", "sneakers", "within", "forty", "five", "hundred,", "size", "7", "if", "you", "have", "it"]
        for word in words:
            self.agent.observe(word)
        final_id = self.agent.finish()
        self.assertEqual(final_id, "P0086")
        self.assertLessEqual(self.tools.searches, 2)


if __name__ == "__main__":
    unittest.main()
