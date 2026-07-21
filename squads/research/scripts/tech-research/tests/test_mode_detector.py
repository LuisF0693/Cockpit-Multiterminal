#!/usr/bin/env python3
"""Unit tests for _mode_detector.py.

Origin: STORY-153.6 (EPIC-153).

Run: python3 squads/research/scripts/tech-research/tests/test_mode_detector.py
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPT_DIR))

from _mode_detector import (  # noqa: E402
    ExtractorMode,
    detect_mode,
    get_primary_report_path,
)


class TestModeDetector(unittest.TestCase):

    def _mkfile(self, dir_path: Path, name: str, content: str = "test") -> None:
        (dir_path / name).write_text(content, encoding="utf-8")

    def test_override_research(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(detect_mode(Path(tmp), override="research"), ExtractorMode.RESEARCH)

    def test_override_bench(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(detect_mode(Path(tmp), override="bench"), ExtractorMode.BENCH)

    def test_detect_research_via_report_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._mkfile(d, "02-research-report.md")
            self.assertEqual(detect_mode(d), ExtractorMode.RESEARCH)

    def test_detect_bench_via_dash_and_exec_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._mkfile(d, "executive-report.md")
            self._mkfile(d, "bench-output-dash.json", "{}")
            self.assertEqual(detect_mode(d), ExtractorMode.BENCH)

    def test_detect_bench_via_dash_only(self):
        """Mixed signals: bench-output-dash.json alone → bench."""
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._mkfile(d, "bench-output-dash.json", "{}")
            self.assertEqual(detect_mode(d), ExtractorMode.BENCH)

    def test_detect_via_parent_folder_bench(self):
        with tempfile.TemporaryDirectory() as tmp:
            parent = Path(tmp) / "docs" / "bench"
            parent.mkdir(parents=True)
            slug_dir = parent / "test-slug"
            slug_dir.mkdir()
            self.assertEqual(detect_mode(slug_dir), ExtractorMode.BENCH)

    def test_detect_via_parent_folder_research(self):
        with tempfile.TemporaryDirectory() as tmp:
            parent = Path(tmp) / "docs" / "research"
            parent.mkdir(parents=True)
            slug_dir = parent / "test-slug"
            slug_dir.mkdir()
            self.assertEqual(detect_mode(slug_dir), ExtractorMode.RESEARCH)

    def test_fallback_to_research(self):
        """No signals → research (backward compat)."""
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(detect_mode(Path(tmp)), ExtractorMode.RESEARCH)

    def test_override_auto_triggers_detection(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._mkfile(d, "02-research-report.md")
            self.assertEqual(detect_mode(d, override="auto"), ExtractorMode.RESEARCH)

    def test_get_primary_report_research(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._mkfile(d, "02-research-report.md", "content")
            result = get_primary_report_path(d, ExtractorMode.RESEARCH)
            self.assertEqual(result.name, "02-research-report.md")

    def test_get_primary_report_bench(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            self._mkfile(d, "executive-report.md", "content")
            result = get_primary_report_path(d, ExtractorMode.BENCH)
            self.assertEqual(result.name, "executive-report.md")

    def test_get_primary_report_missing(self):
        """No file → None (caller handles graceful)."""
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(get_primary_report_path(Path(tmp), ExtractorMode.RESEARCH))


if __name__ == "__main__":
    unittest.main(verbosity=2)
