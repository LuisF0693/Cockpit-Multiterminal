#!/usr/bin/env python3
"""decompose_microdims.py — Expand macro atoms into 3+ microdimensions per axis.

Origin: STORY-153.4 (EPIC-153 DEEP-RESEARCH-GOLDIFY).
Rule: .claude/rules/research-bench-gold.md Rule 3 — Microdimensional Matrix.

Reads:
    {bench_dir}/comparison-matrix.json — macro atoms (existing)
    squads/research/data/bench-microdim-taxonomy.yaml — taxonomy of microdims per axis

Writes:
    {bench_dir}/comparison-matrix.json — augmented with `microdimensions[]` (preserves macro `dimensions[]`)

Behaviour:
    - For each axis in taxonomy, generate microdims as cells per player
    - Score distribution: each micro inherits macro_score (naïve — refinement is separate concern)
    - Weight: micro_weight = axis_weight / N_microdims (preserves total weight via aggregation)
    - VETO: HALT if total microdims < 60 AND profile=gold_absorption

Usage:
    python3 decompose_microdims.py --bench-dir docs/bench/{YYYY-MM-DD}-{slug}/

Exit codes:
    0: Decomposition successful
    1: Missing required input
    2: VETO — gold_absorption profile but < 60 microdims
    3: Argument/environment error
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    sys.stderr.write("ERROR: pyyaml not installed. Install with: pip install pyyaml\n")
    sys.exit(3)


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_TAXONOMY = SCRIPT_DIR.parent.parent / "data" / "bench-microdim-taxonomy.yaml"
MIN_MICRODIMS_FOR_GOLD = 60


def load_taxonomy(path: Path) -> dict[str, Any]:
    if not path.exists():
        sys.stderr.write(f"ERROR: taxonomy not found at {path}\n")
        sys.exit(3)
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_matrix(path: Path) -> dict[str, Any]:
    if not path.exists():
        sys.stderr.write(f"ERROR: comparison-matrix.json not found at {path}\n")
        sys.exit(1)
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def extract_players(matrix: dict[str, Any]) -> list[str]:
    players = matrix.get("players") or []
    if isinstance(players, list) and players:
        if isinstance(players[0], dict):
            return [p.get("key") or p.get("id") or p.get("name") for p in players if (p.get("key") or p.get("id") or p.get("name"))]
        return list(players)
    return []


def find_macro_row(matrix: dict[str, Any], axis_id: str) -> dict[str, Any] | None:
    """Find a row matching axis_id in matrix dimensions/rows by id or group."""
    for key in ("dimensions", "rows"):
        rows = matrix.get(key) or []
        for row in rows:
            if row.get("id") == axis_id or row.get("group") == axis_id:
                return row
    return None


def get_macro_score(macro_row: dict[str, Any] | None, player: str) -> float | None:
    """Extract macro score for player from macro row, or None if absent."""
    if macro_row is None:
        return None
    cells = macro_row.get("cells")
    if isinstance(cells, list):
        for cell in cells:
            if cell.get("player") == player:
                v = cell.get("score")
                return float(v) if v is not None else None
    scores = macro_row.get("scores")
    if isinstance(scores, dict) and player in scores:
        v = scores[player]
        return float(v) if v is not None else None
    return None


def decompose(taxonomy: dict[str, Any], matrix: dict[str, Any], players: list[str]) -> list[dict[str, Any]]:
    """Expand each axis into microdims, distributing scores naïvely from macro parents."""
    microdims: list[dict[str, Any]] = []
    for axis in taxonomy.get("axes", []):
        axis_id = axis["id"]
        axis_weight = axis.get("weight_share", 0.0)
        macro_row = find_macro_row(matrix, axis_id)
        N = len(axis["microdims"])
        if N == 0:
            continue
        micro_weight = axis_weight / N

        for micro in axis["microdims"]:
            cells: list[dict[str, Any]] = []
            for player in players:
                macro_score = get_macro_score(macro_row, player)
                cells.append({
                    "player": player,
                    "score": macro_score if macro_score is not None else 0,
                    "confidence": "medium" if macro_score is not None else "low",
                    "notes": "Inherited from macro atom (naïve distribution)",
                    "source": f"macro:{axis_id}",
                })
            # Compute best_player and best_score from cells
            valid_cells = [c for c in cells if c["score"] is not None]
            if valid_cells:
                best_cell = max(valid_cells, key=lambda c: c["score"])
                best_player = best_cell["player"]
                best_score = best_cell["score"]
            else:
                best_player = ""
                best_score = 0

            microdims.append({
                "id": micro["id"],
                "parent_id": axis_id,
                "label": micro["label"],
                "question": micro["question"],
                "group": axis_id,
                "weight": round(micro_weight, 4),
                "cells": cells,
                "best_player": best_player,
                "best_score": best_score,
            })
    return microdims


def validate_total_weight(microdims: list[dict[str, Any]], taxonomy: dict[str, Any], tolerance: float = 0.01) -> bool:
    """Verify sum(micro_weights) per axis equals axis_weight (within tolerance)."""
    by_axis: dict[str, float] = {}
    for m in microdims:
        by_axis[m["parent_id"]] = by_axis.get(m["parent_id"], 0) + m["weight"]
    for axis in taxonomy.get("axes", []):
        expected = axis.get("weight_share", 0.0)
        actual = by_axis.get(axis["id"], 0.0)
        if abs(actual - expected) > tolerance:
            sys.stderr.write(f"WARNING: weight aggregation drift for {axis['id']}: expected {expected}, actual {actual}\n")
            return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bench-dir", required=True, type=Path, help="Path to docs/bench/{YYYY-MM-DD}-{slug}/")
    parser.add_argument("--taxonomy", type=Path, default=DEFAULT_TAXONOMY, help="Path to taxonomy YAML")
    parser.add_argument("--profile", default="gold_absorption", choices=["standard", "gold_absorption"], help="Bench profile (default: gold_absorption)")
    args = parser.parse_args()

    bench_dir: Path = args.bench_dir.resolve()
    if not bench_dir.is_dir():
        sys.stderr.write(f"ERROR: bench-dir not found: {bench_dir}\n")
        return 3

    taxonomy = load_taxonomy(args.taxonomy)
    matrix = load_matrix(bench_dir / "comparison-matrix.json")
    players = extract_players(matrix)
    if not players:
        sys.stderr.write("ERROR: no players found in matrix\n")
        return 1

    microdims = decompose(taxonomy, matrix, players)
    print(f"Generated {len(microdims)} microdims across {len(taxonomy.get('axes', []))} axes for {len(players)} players", flush=True)

    # VETO for gold_absorption if < MIN_MICRODIMS_FOR_GOLD
    if args.profile == "gold_absorption" and len(microdims) < MIN_MICRODIMS_FOR_GOLD:
        sys.stderr.write(
            f"VETO: gold_absorption profile requires ≥{MIN_MICRODIMS_FOR_GOLD} microdims. Got {len(microdims)}.\n"
            f"      Either expand taxonomy or use --profile standard.\n"
        )
        return 2

    # Weight validation (warn only)
    validate_total_weight(microdims, taxonomy)

    # Write augmented matrix (preserve original `dimensions` macro array, add `microdimensions`)
    matrix["microdimensions"] = microdims
    matrix.setdefault("metadata", {})["microdim_decomposer_version"] = taxonomy.get("version", "?")

    out_path = bench_dir / "comparison-matrix.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(matrix, f, indent=2, ensure_ascii=False)
    print(f"✓ Wrote {out_path} with {len(microdims)} microdimensions", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
