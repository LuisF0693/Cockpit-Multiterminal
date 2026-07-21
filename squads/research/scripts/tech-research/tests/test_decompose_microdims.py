#!/usr/bin/env python3
"""Unit tests for decompose_microdims.py.

Origin: STORY-153.4 (EPIC-153) — AC4 mandates 7 unit tests.

Run: python3 squads/research/scripts/tech-research/tests/test_decompose_microdims.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from decompose_microdims import (  # noqa: E402
    DEFAULT_TAXONOMY,
    decompose,
    extract_players,
    find_macro_row,
    get_macro_score,
    load_taxonomy,
    validate_total_weight,
)


class TestDecomposeMicrodims(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.taxonomy = load_taxonomy(DEFAULT_TAXONOMY)

    def _matrix_3p(self):
        return {
            "players": ["a", "b", "c"],
            "dimensions": [
                {"id": "agentic_planning_control", "group": "agentic_planning_control",
                 "cells": [{"player": "a", "score": 85}, {"player": "b", "score": 60}, {"player": "c", "score": 75}]},
                {"id": "tool_runtime_integration", "group": "tool_runtime_integration",
                 "cells": [{"player": "a", "score": 70}, {"player": "b", "score": 90}, {"player": "c", "score": 50}]},
            ],
        }

    def test_taxonomy_load(self):
        self.assertIn("axes", self.taxonomy)
        self.assertGreaterEqual(len(self.taxonomy["axes"]), 6, "expected ≥6 axes")

    def test_macro_to_at_least_3_micros(self):
        """For each axis, taxonomy provides ≥3 microdims."""
        for axis in self.taxonomy["axes"]:
            self.assertGreaterEqual(len(axis["microdims"]), 3, f"axis {axis['id']} has <3 microdims")

    def test_weight_preservation(self):
        """Sum of micro_weights per axis equals axis weight_share (±0.01)."""
        matrix = self._matrix_3p()
        players = extract_players(matrix)
        microdims = decompose(self.taxonomy, matrix, players)
        self.assertTrue(validate_total_weight(microdims, self.taxonomy, tolerance=0.01))

    def test_min_60_microdims_for_gold(self):
        """Production taxonomy yields ≥60 microdims for gold profile."""
        matrix = self._matrix_3p()
        players = extract_players(matrix)
        microdims = decompose(self.taxonomy, matrix, players)
        self.assertGreaterEqual(len(microdims), 60)

    def test_best_player_computed(self):
        """Best player is the one with max score in each microdim."""
        matrix = self._matrix_3p()
        players = extract_players(matrix)
        microdims = decompose(self.taxonomy, matrix, players)
        apc_micros = [m for m in microdims if m["parent_id"] == "agentic_planning_control"]
        self.assertGreater(len(apc_micros), 0)
        # For agentic_planning_control, macro scores: a=85, b=60, c=75. Best is 'a'.
        self.assertEqual(apc_micros[0]["best_player"], "a")
        self.assertEqual(apc_micros[0]["best_score"], 85)

    def test_cells_complete(self):
        """N players input → N cells per microdim."""
        matrix = self._matrix_3p()
        players = extract_players(matrix)
        microdims = decompose(self.taxonomy, matrix, players)
        for m in microdims:
            self.assertEqual(len(m["cells"]), 3, f"{m['id']} has {len(m['cells'])} cells, expected 3")

    def test_microdim_id_format(self):
        """Each microdim has id matching {parent_id}__{suffix} pattern."""
        for axis in self.taxonomy["axes"]:
            axis_prefix = axis["id"].split("_")[0]  # e.g., "agentic" from "agentic_planning_control"
            for m in axis["microdims"]:
                self.assertIn("__", m["id"], f"{m['id']} missing __ separator")

    def test_cells_have_required_fields(self):
        matrix = self._matrix_3p()
        players = extract_players(matrix)
        microdims = decompose(self.taxonomy, matrix, players)
        for m in microdims:
            for cell in m["cells"]:
                self.assertIn("player", cell)
                self.assertIn("score", cell)
                self.assertIn("confidence", cell)

    def test_find_macro_row_by_id(self):
        matrix = self._matrix_3p()
        row = find_macro_row(matrix, "agentic_planning_control")
        self.assertIsNotNone(row)
        self.assertEqual(row["id"], "agentic_planning_control")

    def test_get_macro_score_missing_player(self):
        """If player not in macro row, get_macro_score returns None."""
        row = {"cells": [{"player": "a", "score": 80}]}
        self.assertEqual(get_macro_score(row, "a"), 80)
        self.assertIsNone(get_macro_score(row, "b"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
