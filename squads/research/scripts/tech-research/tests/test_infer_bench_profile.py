#!/usr/bin/env python3
"""Unit tests for infer_bench_profile.py.

Origin: STORY-153.1 (EPIC-153) — AC2 mandates 7 unit tests.

Run:
    python3 -m pytest squads/research/scripts/tech-research/tests/test_infer_bench_profile.py -v
    # or directly:
    python3 squads/research/scripts/tech-research/tests/test_infer_bench_profile.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

# Add parent dir to sys.path so we can import infer_bench_profile as a module
SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from infer_bench_profile import (  # noqa: E402
    DEFAULT_CONFIG_PATH,
    infer_profile,
    load_config,
    parse_players,
    match_keyword,
)


class TestInferBenchProfile(unittest.TestCase):
    """Tests for the bench profile inference logic.

    All tests use the production config at squads/research/data/bench-profile-inference.yaml
    to ensure the keyword list and thresholds remain in sync with reality.
    """

    @classmethod
    def setUpClass(cls):
        cls.config = load_config(DEFAULT_CONFIG_PATH)

    # AC2 mandated tests ----------------------------------------------------

    def test_5_players_no_keyword_returns_gold(self):
        """players=[a,b,c,d,e], query='quick' (no keyword) → gold (trigger=count)"""
        players = parse_players("a,b,c,d,e")
        profile, trigger = infer_profile(players, "quick", None, self.config)
        self.assertEqual(profile, "gold_absorption")
        self.assertEqual(trigger, "count")

    def test_3_players_no_keyword_returns_standard(self):
        """players=[a,b,c], query='quick compare' → standard (trigger=default)"""
        players = parse_players("a,b,c")
        profile, trigger = infer_profile(players, "quick compare", None, self.config)
        self.assertEqual(profile, "standard")
        self.assertEqual(trigger, "default")

    def test_3_players_absorption_keyword_returns_gold(self):
        """players=[a,b,c], query='absorption analysis' → gold (trigger=keyword:absorption)"""
        players = parse_players("a,b,c")
        profile, trigger = infer_profile(players, "absorption analysis", None, self.config)
        self.assertEqual(profile, "gold_absorption")
        self.assertTrue(trigger.startswith("keyword:absorption"), f"trigger was {trigger}")

    def test_override_standard_beats_count(self):
        """players=[a,b,c,d,e], override=standard → standard (trigger=override_standard)"""
        players = parse_players("a,b,c,d,e")
        profile, trigger = infer_profile(players, "anything", "standard", self.config)
        self.assertEqual(profile, "standard")
        self.assertEqual(trigger, "override_standard")

    def test_override_gold_beats_low_count(self):
        """players=[a,b], override=gold → gold (trigger=override_gold)"""
        players = parse_players("a,b")
        profile, trigger = infer_profile(players, "anything", "gold", self.config)
        self.assertEqual(profile, "gold_absorption")
        self.assertEqual(trigger, "override_gold")

    def test_case_insensitive_keyword(self):
        """query='ABSORPTION LANDSCAPE' (uppercase) → gold (case-insensitive match)"""
        players = parse_players("a,b")
        profile, trigger = infer_profile(players, "ABSORPTION LANDSCAPE", None, self.config)
        self.assertEqual(profile, "gold_absorption")
        self.assertTrue(trigger.startswith("keyword:"), f"trigger was {trigger}")

    def test_keyword_substring_match(self):
        """query='how do open-source projects compare' → gold (substring match)"""
        players = parse_players("a,b,c")
        profile, trigger = infer_profile(players, "how do open-source projects compare", None, self.config)
        self.assertEqual(profile, "gold_absorption")
        self.assertTrue("open-source" in trigger or "open source" in trigger, f"trigger was {trigger}")

    # Additional defensive tests --------------------------------------------

    def test_empty_query_no_players_returns_standard(self):
        """Edge case: empty inputs → standard default"""
        profile, trigger = infer_profile([], "", None, self.config)
        self.assertEqual(profile, "standard")
        self.assertEqual(trigger, "default")

    def test_exact_5_players_boundary(self):
        """Boundary: exactly 5 players → gold (>=5 inclusive)"""
        players = parse_players("a,b,c,d,e")
        profile, _ = infer_profile(players, "", None, self.config)
        self.assertEqual(profile, "gold_absorption")

    def test_exact_4_players_below_boundary(self):
        """Boundary: 4 players (below 5) with no keyword → standard"""
        players = parse_players("a,b,c,d")
        profile, _ = infer_profile(players, "", None, self.config)
        self.assertEqual(profile, "standard")

    def test_parse_players_strips_whitespace(self):
        """parse_players handles whitespace correctly"""
        result = parse_players(" a , b , c ")
        self.assertEqual(result, ["a", "b", "c"])

    def test_parse_players_empty_string(self):
        """parse_players returns empty list for empty string"""
        result = parse_players("")
        self.assertEqual(result, [])

    def test_keyword_vs_with_word_boundary(self):
        """' vs ' matches with word boundary (avoids matching 'versus')"""
        result = match_keyword("X vs Y comparison", [" vs "], case_sensitive=False)
        self.assertIsNotNone(result)
        # Also test that "versus" does NOT match " vs " keyword
        result_negative = match_keyword("versus comparison", [" vs "], case_sensitive=False)
        # The substring " vs " is NOT in "versus comparison" (no space-vs-space match)
        # But "versus" contains "vs" — yet the keyword is " vs " (with spaces), so should not match
        # versus has chars 'v','e','r','s','u','s' — no " vs " substring
        self.assertIsNone(result_negative)


if __name__ == "__main__":
    unittest.main(verbosity=2)
