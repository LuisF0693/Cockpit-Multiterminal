#!/usr/bin/env python3
"""Unit tests for build_duels.py.

Origin: STORY-153.3 (EPIC-153) — AC2 mandates 9 unit tests.

Run:
    python3 squads/research/scripts/tech-research/tests/test_build_duels.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from build_duels import build_all_pairs_duels, compute_duel  # noqa: E402


def make_row(dim_id: str, scores: dict[str, float]) -> dict:
    return {"id": dim_id, "cells": [{"player": p, "score": s} for p, s in scores.items()]}


class TestBuildDuels(unittest.TestCase):

    def test_2_players_returns_1_duel(self):
        duels = build_all_pairs_duels(["a", "b"], [])
        self.assertEqual(len(duels), 1)

    def test_3_players_returns_3_duels(self):
        duels = build_all_pairs_duels(["a", "b", "c"], [])
        self.assertEqual(len(duels), 3)

    def test_10_players_returns_45_duels(self):
        duels = build_all_pairs_duels([f"p{i}" for i in range(10)], [])
        self.assertEqual(len(duels), 45)

    def test_25_players_returns_300_duels(self):
        duels = build_all_pairs_duels([f"p{i}" for i in range(25)], [])
        self.assertEqual(len(duels), 300)

    def test_no_self_duels(self):
        duels = build_all_pairs_duels(["a", "b", "c", "d"], [])
        for d in duels:
            self.assertNotEqual(d["a"], d["b"], f"self-duel detected: {d}")

    def test_no_duplicate_duels(self):
        duels = build_all_pairs_duels(["a", "b", "c", "d"], [])
        pairs = [(d["a"], d["b"]) for d in duels]
        self.assertEqual(len(pairs), len(set(pairs)), "duplicate duels detected")

    def test_verdict_a_wins(self):
        rows = [
            make_row("d1", {"a": 90, "b": 60}),
            make_row("d2", {"a": 85, "b": 70}),
        ]
        duels = build_all_pairs_duels(["a", "b"], rows)
        self.assertEqual(duels[0]["winsA"], 2)
        self.assertEqual(duels[0]["winsB"], 0)
        self.assertEqual(duels[0]["verdict"], "A wins")

    def test_verdict_tie(self):
        rows = [
            make_row("d1", {"a": 80, "b": 80}),
            make_row("d2", {"a": 70, "b": 70}),
        ]
        duels = build_all_pairs_duels(["a", "b"], rows)
        self.assertEqual(duels[0]["ties"], 2)
        self.assertEqual(duels[0]["verdict"], "tie")

    def test_microdim_breakdown_complete(self):
        rows = [
            make_row("d1", {"a": 80, "b": 60}),
            make_row("d2", {"a": 50, "b": 70}),
            make_row("d3", {"a": 75, "b": 75}),
        ]
        duels = build_all_pairs_duels(["a", "b"], rows, include_breakdown=True)
        bd = duels[0]["microdim_breakdown"]
        self.assertEqual(len(bd), 3)
        self.assertEqual(bd[0]["winner"], "a")
        self.assertEqual(bd[1]["winner"], "b")
        self.assertEqual(bd[2]["winner"], "tie")

    def test_no_breakdown_flag(self):
        rows = [make_row("d1", {"a": 80, "b": 60})]
        duels = build_all_pairs_duels(["a", "b"], rows, include_breakdown=False)
        self.assertNotIn("microdim_breakdown", duels[0])

    def test_missing_score_skipped(self):
        """If player has no score in a row, that dim is skipped (not counted as tie)."""
        rows = [
            {"id": "d1", "cells": [{"player": "a", "score": 80}]},  # b missing
            make_row("d2", {"a": 70, "b": 70}),
        ]
        duels = build_all_pairs_duels(["a", "b"], rows)
        # Only d2 counts → 0 wins, 1 tie
        self.assertEqual(duels[0]["winsA"], 0)
        self.assertEqual(duels[0]["winsB"], 0)
        self.assertEqual(duels[0]["ties"], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
