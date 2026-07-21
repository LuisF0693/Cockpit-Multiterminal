#!/usr/bin/env python3
"""_mode_detector.py — Shared mode detection for research/bench extractors.

Origin: STORY-153.6 (EPIC-153 DEEP-RESEARCH-GOLDIFY).
Rule: .claude/rules/research-bench-gold.md Rule 11 — Unified Extractor Mode.

Detects whether a directory is a research-mode dossier (docs/research/{slug}/)
or a bench-mode benchmark (docs/bench/{slug}/) via filesystem heuristics.

Usage (from another extractor):
    from _mode_detector import detect_mode, ExtractorMode
    mode = detect_mode(output_dir, override=args.mode)
    if mode == ExtractorMode.RESEARCH:
        ...
    elif mode == ExtractorMode.BENCH:
        ...

Detection heuristic (priority order):
    1. Override flag (--mode=research|bench): explicit user choice
    2. Filesystem signals (file presence):
       - `02-research-report.md` present → research
       - `executive-report.md` + `bench-output-dash.json` present → bench
    3. Parent folder name:
       - parent ends with `docs/bench` → bench
       - parent ends with `docs/research` → research
    4. Fallback: research (preserves backward compat — most existing scripts assume research)

The fallback is `research` (not raise) to preserve backward compatibility:
    Pre-EPIC-153, all extractors assumed research-mode. New `--mode` flag is opt-in.
"""
from __future__ import annotations

from enum import Enum
from pathlib import Path


class ExtractorMode(str, Enum):
    """Bench-vs-research mode for extractor scripts."""
    RESEARCH = "research"
    BENCH = "bench"
    AUTO = "auto"  # caller will resolve via detect_mode()


def detect_mode(output_dir: Path, override: str | None = None) -> ExtractorMode:
    """Detect extractor mode for a given output directory.

    Args:
        output_dir: Path to docs/research/{slug}/ or docs/bench/{slug}/
        override: Optional explicit mode (research|bench|auto). If 'auto' or None,
                  apply heuristic detection.

    Returns:
        ExtractorMode.RESEARCH or ExtractorMode.BENCH (never AUTO — always resolved).
    """
    # Priority 1: explicit override
    if override in ("research", "bench"):
        return ExtractorMode(override)

    output_dir = Path(output_dir).resolve()

    # Priority 2: filesystem signals
    has_research_report = (output_dir / "02-research-report.md").exists()
    has_exec_report = (output_dir / "executive-report.md").exists()
    has_bench_dash = (output_dir / "bench-output-dash.json").exists()

    if has_exec_report and has_bench_dash:
        return ExtractorMode.BENCH
    if has_research_report and not has_bench_dash:
        return ExtractorMode.RESEARCH
    # Mixed signals: prefer bench if has bench-output-dash
    if has_bench_dash:
        return ExtractorMode.BENCH

    # Priority 3: parent folder name
    parent_str = str(output_dir.parent)
    if parent_str.endswith("docs/bench") or "/docs/bench/" in parent_str:
        return ExtractorMode.BENCH
    if parent_str.endswith("docs/research") or "/docs/research/" in parent_str:
        return ExtractorMode.RESEARCH

    # Priority 4: fallback (preserves backward compat)
    return ExtractorMode.RESEARCH


def get_primary_report_path(output_dir: Path, mode: ExtractorMode) -> Path | None:
    """Return path to the primary report file for the given mode.

    Returns None if the expected file doesn't exist (caller can graceful-fallback).
    """
    if mode == ExtractorMode.BENCH:
        candidate = output_dir / "executive-report.md"
    else:
        candidate = output_dir / "02-research-report.md"
    return candidate if candidate.exists() else None


def add_mode_argument(parser) -> None:
    """Helper: add standard --mode flag to argparse parser.

    Used by all 6 extractors to avoid duplicating the flag definition.
    """
    parser.add_argument(
        "--mode",
        choices=["research", "bench", "auto"],
        default="auto",
        help="Extractor mode: 'research' (docs/research/), 'bench' (docs/bench/), or 'auto' (detect from filesystem). Default: auto.",
    )
