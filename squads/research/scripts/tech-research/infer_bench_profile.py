#!/usr/bin/env python3
"""infer_bench_profile.py — Infer bench profile (gold_absorption vs standard).

This is BENCH-PROFILE inference, NOT research-type inference.
For research-type (tech/bench/market/product/mapping) see research_profile.py.

Origin: STORY-153.1 (EPIC-153 DEEP-RESEARCH-GOLDIFY).
Post-mortem: docs/bench/deepresearch-absorption-benchmark/skill-gap-analysis-tech-research.md
Rule: .claude/rules/research-bench-gold.md (Rule 1 — Profile Auto-Inference).

Rationale:
    The bench of 2026-05-18 came out Silver (16 artifacts) instead of Gold (45+)
    because the skill /research-bench did NOT auto-fire profile=gold_absorption
    even though players.length=10. This script externalizes the inference into
    a deterministic, unit-testable CLI helper.

Usage:
    # Auto-detect from players count and query keywords
    python3 infer_bench_profile.py --players "a,b,c,d,e" --query "X vs Y"

    # Force standard despite ≥5 players
    python3 infer_bench_profile.py --players "a,b,c,d,e" --query "..." --override standard

    # Force gold despite <5 players and no keyword
    python3 infer_bench_profile.py --players "a,b" --query "..." --override gold

Output (stdout, JSON):
    {"profile": "gold_absorption", "trigger": "count"}
    {"profile": "gold_absorption", "trigger": "keyword:absorption"}
    {"profile": "standard", "trigger": "default"}
    {"profile": "gold_absorption", "trigger": "override_gold"}
    {"profile": "standard", "trigger": "override_standard"}

Exit codes:
    0: Profile inferred successfully
    3: Invalid arguments (e.g., both --standard and --gold simultaneously)

Prior-Art Note:
    research_profile.py:171 has infer_profile() but classifies research-TYPE
    (tech/bench/market/product/mapping). This script is ORTHOGONAL: it classifies
    bench-PROFILE (gold_absorption/standard) within an already-classified bench.
    Pattern adapted (regex scoring), axis different.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    sys.stderr.write("ERROR: pyyaml not installed. Install with: pip install pyyaml\n")
    sys.exit(3)


# Resolve config path relative to this script (portable across machines)
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = SCRIPT_DIR.parent.parent / "data" / "bench-profile-inference.yaml"


def load_config(config_path: Path) -> dict[str, Any]:
    """Load keyword list and thresholds from YAML config."""
    if not config_path.exists():
        sys.stderr.write(f"ERROR: config not found at {config_path}\n")
        sys.exit(3)
    with config_path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_players(players_arg: str) -> list[str]:
    """Parse comma-separated players string into a list, stripping whitespace.

    Returns empty list if input is empty/None.
    """
    if not players_arg:
        return []
    return [p.strip() for p in players_arg.split(",") if p.strip()]


def match_keyword(query: str, keywords: list[str], case_sensitive: bool) -> str | None:
    """Return the first matched keyword in the query, or None if no match."""
    if not query:
        return None
    haystack = query if case_sensitive else query.lower()
    for kw in keywords:
        needle = kw if case_sensitive else kw.lower()
        # Special handling for "compare X with/to/and Y" patterns
        if "compare X" in needle:
            # Build regex: "compare\s+\w+\s+(with|to|and)\s+\w+"
            connector = needle.split(" ")[-2]  # "with" or "to" or "and"
            pattern = rf"\bcompare\s+\w+\s+{connector}\s+\w+\b"
            if re.search(pattern, haystack, flags=0 if case_sensitive else re.IGNORECASE):
                return kw
        elif needle in haystack:
            return kw
    return None


def infer_profile(
    players: list[str],
    query: str,
    override: str | None,
    config: dict[str, Any],
) -> tuple[str, str]:
    """Infer bench profile.

    Returns (profile, trigger):
        profile  : "gold_absorption" | "standard"
        trigger  : "override_gold" | "override_standard" | "count" | "keyword:<kw>" | "default"
    """
    # Override has highest precedence
    if override == "gold":
        return "gold_absorption", "override_gold"
    if override == "standard":
        return "standard", "override_standard"

    # Auto-inference
    thresholds = config.get("thresholds", {})
    min_players = thresholds.get("min_players_for_gold", 5)
    keywords = config.get("gold_keywords", [])
    case_sensitive = config.get("case_sensitive", False)

    if len(players) >= min_players:
        return "gold_absorption", "count"

    matched_kw = match_keyword(query, keywords, case_sensitive)
    if matched_kw is not None:
        return "gold_absorption", f"keyword:{matched_kw.strip()}"

    return "standard", "default"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Infer bench profile (gold_absorption vs standard) from players and query."
    )
    parser.add_argument(
        "--players",
        default="",
        help="Comma-separated list of player names (e.g., 'a,b,c').",
    )
    parser.add_argument(
        "--query",
        default="",
        help="Query string to inspect for keywords.",
    )
    parser.add_argument(
        "--override",
        choices=["gold", "standard"],
        default=None,
        help="Force profile regardless of auto-inference. Use --override gold or --override standard.",
    )
    parser.add_argument(
        "--standard",
        action="store_true",
        help="Shortcut for --override standard.",
    )
    parser.add_argument(
        "--gold",
        action="store_true",
        help="Shortcut for --override gold.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="Path to bench-profile-inference.yaml (default: %(default)s).",
    )
    args = parser.parse_args()

    # Resolve shortcut flags vs --override
    if args.standard and args.gold:
        sys.stderr.write(
            "ERROR: --standard and --gold are mutually exclusive. Cannot use both simultaneously.\n"
        )
        return 3
    if args.standard:
        if args.override == "gold":
            sys.stderr.write("ERROR: --standard conflicts with --override gold.\n")
            return 3
        args.override = "standard"
    if args.gold:
        if args.override == "standard":
            sys.stderr.write("ERROR: --gold conflicts with --override standard.\n")
            return 3
        args.override = "gold"

    config = load_config(args.config)
    players = parse_players(args.players)
    profile, trigger = infer_profile(players, args.query, args.override, config)

    json.dump({"profile": profile, "trigger": trigger}, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
