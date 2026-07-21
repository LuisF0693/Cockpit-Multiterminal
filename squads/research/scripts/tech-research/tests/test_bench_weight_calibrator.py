#!/usr/bin/env python3
"""Unit tests for bench_weight_calibrator.py.

Origin: Founder directive 2026-05-18 — calibration must happen BEFORE bench execution.

Run: python3 squads/research/scripts/tech-research/tests/test_bench_weight_calibrator.py
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from bench_weight_calibrator import (  # noqa: E402
    MACRO_GROUPS,
    PRESETS,
    build_weights_yaml,
    normalize_weights,
)


class TestBenchWeightCalibrator(unittest.TestCase):

    def test_macro_groups_count_15(self):
        """15 macro groups defined (sinkra_fit REMOVED 2026-05-18 — framework agnosticism)."""
        self.assertEqual(len(MACRO_GROUPS), 15)

    def test_critical_groups_present(self):
        """3 critical groups must be in MACRO_GROUPS."""
        ids = [g["id"] for g in MACRO_GROUPS]
        self.assertIn("research_depth_synthesis", ids)
        self.assertIn("tool_runtime_integration", ids)
        self.assertIn("multi_agent_orchestration", ids)

    def test_sinkra_fit_REMOVED_from_macro_groups(self):
        """sinkra_fit must NOT be a macro group (framework agnostic mandate 2026-05-18)."""
        ids = [g["id"] for g in MACRO_GROUPS]
        self.assertNotIn("sinkra_fit", ids, "sinkra_fit must be REMOVED, not zeroed")

    def test_no_anchor_self_reference_flag_remaining(self):
        """No remaining MACRO_GROUP should have anchor_self_reference flag (sinkra_fit was the only one)."""
        for g in MACRO_GROUPS:
            self.assertFalse(
                g.get("anchor_self_reference", False),
                f"group {g['id']} still has anchor_self_reference flag",
            )

    def test_presets_all_sum_close_to_100(self):
        """Each preset's weights should sum to ~100 (raw)."""
        for name, weights in PRESETS.items():
            total = sum(weights.values())
            # Allow ±10 deviation in raw, normalize handles final
            self.assertGreater(total, 50, f"preset {name} total {total} too low")
            self.assertLessEqual(total, 130, f"preset {name} total {total} too high")

    def test_preset_technical_emphasizes_tech_dims(self):
        """Technical preset: agentic + tool + multi-agent must dominate."""
        p = PRESETS["technical"]
        big_3 = p["agentic_planning_control"] + p["tool_runtime_integration"] + p["multi_agent_orchestration"]
        self.assertGreaterEqual(big_3, 40, f"technical preset big-3 too low: {big_3}")

    def test_preset_academic_emphasizes_depth_and_evidence(self):
        """Academic preset: research_depth + evidence_fidelity must dominate."""
        p = PRESETS["academic"]
        big_2 = p["research_depth_synthesis"] + p["evidence_fidelity_evaluation"]
        self.assertGreaterEqual(big_2, 30, f"academic preset depth+evidence too low: {big_2}")

    def test_preset_product_emphasizes_ux(self):
        """Product preset: ux + product_ux_reference must dominate."""
        p = PRESETS["product"]
        ux_total = p["ux_operator_control"] + p["product_ux_reference"]
        self.assertGreaterEqual(ux_total, 30, f"product preset ux total too low: {ux_total}")

    def test_all_presets_sinkra_fit_ABSENT(self):
        """sinkra_fit must be ABSENT from ALL presets (framework agnostic mandate)."""
        for name, weights in PRESETS.items():
            self.assertNotIn(
                "sinkra_fit", weights,
                f"preset {name} still has sinkra_fit — must be REMOVED, not zeroed",
            )

    def test_normalize_weights_sums_to_100(self):
        """normalize_weights produces sum == 100."""
        raw = {"a": 10, "b": 20, "c": 30}  # total 60
        normalized = normalize_weights(raw)
        self.assertAlmostEqual(sum(normalized.values()), 100.0, places=1)

    def test_normalize_weights_zero_handling(self):
        """If all weights are 0, normalize_weights returns input unchanged (caller must reject)."""
        raw = {"a": 0, "b": 0}
        normalized = normalize_weights(raw)
        self.assertEqual(normalized, raw)

    def test_build_weights_yaml_schema(self):
        """build_weights_yaml produces valid bench-weights.v1 payload."""
        raw = dict(PRESETS["technical"])
        normalized = normalize_weights(raw)
        payload = build_weights_yaml("2026-05-18-test", normalized, raw, "technical", "1.0.0")

        # Schema fields
        self.assertEqual(payload["schema_version"], "bench-weights.v1")
        self.assertEqual(payload["bench_slug"], "2026-05-18-test")
        self.assertEqual(payload["preset_used"], "technical")
        self.assertEqual(payload["calibration_method"], "preset:technical")
        self.assertIn("generated_at", payload)
        self.assertIn("normalized_weights", payload)
        self.assertIn("raw_weights", payload)

        # Critical groups acknowledged
        self.assertEqual(
            sorted(payload["critical_groups_acknowledged"]),
            sorted(["research_depth_synthesis", "tool_runtime_integration", "multi_agent_orchestration"]),
        )

    def test_build_weights_excluded_groups_tracked(self):
        """Groups with raw weight = 0 listed in excluded_groups[]."""
        raw = {"research_depth_synthesis": 10, "training_methodology": 0, "compliance_safety": 0}
        payload = build_weights_yaml("test", normalize_weights(raw), raw, "technical", "1.0.0")
        self.assertIn("training_methodology", payload["excluded_groups"])
        self.assertIn("compliance_safety", payload["excluded_groups"])
        self.assertNotIn("research_depth_synthesis", payload["excluded_groups"])

    def test_framework_agnostic_validation_in_payload(self):
        """Generated bench-weights.yaml must declare framework_agnostic=True."""
        raw = dict(PRESETS["technical"])
        payload = build_weights_yaml("test", normalize_weights(raw), raw, "technical", "1.0.0")
        self.assertTrue(payload["validation"]["framework_agnostic"])
        self.assertIn("sinkra_fit_removed", payload["validation"])
        self.assertNotIn("sinkra_fit", payload["normalized_weights"])
        self.assertNotIn("sinkra_fit", payload["raw_weights"])

    def test_interactive_calibration_method_marker(self):
        """If preset_used=None, calibration_method = 'interactive'."""
        payload = build_weights_yaml("test", {}, {}, None, "1.0.0")
        self.assertEqual(payload["calibration_method"], "interactive")
        self.assertIsNone(payload["preset_used"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
