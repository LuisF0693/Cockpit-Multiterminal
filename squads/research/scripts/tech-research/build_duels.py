#!/usr/bin/env python3
"""build_duels.py — Generate N-choose-2 duels for bench multi-player comparisons.

Origin: STORY-153.3 (EPIC-153 DEEP-RESEARCH-GOLDIFY).
Rule: .claude/rules/research-bench-gold.md Rule 4 — All-Pairs Duels.

Replaces anchor-vs-each duels (N-1 entries) with all-pairs duels (N choose 2 entries):
    10 players → 45 duels (vs 9 anchor-only)
    9 players  → 36 duels (vs 8 anchor-only)
    5 players  → 10 duels (vs 4 anchor-only)

Usage:
    python3 build_duels.py --bench-dir docs/bench/{YYYY-MM-DD}-{slug}/
    python3 build_duels.py --bench-dir <dir> --no-breakdown    # smaller output

Reads:
    {bench_dir}/comparison-matrix.json  — must have `players` and either `rows` or `microdimensions`
    {bench_dir}/players.yaml (optional) — fallback if matrix players empty

Writes:
    {bench_dir}/duels.json — array of {a, b, winsA, winsB, ties, verdict, microdim_breakdown}

Exit codes:
    0: Duels emitted successfully
    1: Missing required input (comparison-matrix.json)
    2: Schema mismatch in input
    3: Argument error
"""
from __future__ import annotations

import argparse
import itertools
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # YAML is optional fallback


def load_matrix(matrix_path: Path) -> dict[str, Any]:
    if not matrix_path.exists():
        sys.stderr.write(f"ERROR: comparison-matrix.json not found at {matrix_path}\n")
        sys.exit(1)
    try:
        with matrix_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        sys.stderr.write(f"ERROR: failed to parse {matrix_path}: {e}\n")
        sys.exit(2)


def load_players_fallback(players_yaml: Path) -> list[str]:
    if not players_yaml.exists() or yaml is None:
        return []
    try:
        with players_yaml.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return [p.get("id") or p.get("key") for p in data.get("players", []) if (p.get("id") or p.get("key"))]
    except Exception:  # pragma: no cover
        return []


def extract_players(matrix: dict[str, Any], bench_dir: Path) -> list[str]:
    """Extract player list from matrix.players, then fallback to players.yaml."""
    players = matrix.get("players") or []
    if isinstance(players, list) and players:
        # Players can be list of strings OR list of dicts
        if isinstance(players[0], dict):
            return [p.get("key") or p.get("id") or p.get("name") for p in players if (p.get("key") or p.get("id") or p.get("name"))]
        return list(players)
    # Fallback
    return load_players_fallback(bench_dir / "players.yaml")


def extract_dimension_rows(matrix: dict[str, Any]) -> list[dict[str, Any]]:
    """Return the list of dimension rows. Prefer microdimensions if present, else rows/dimensions."""
    for key in ("microdimensions", "rows", "dimensions"):
        rows = matrix.get(key)
        if isinstance(rows, list) and rows:
            return rows
    return []


def get_cell_score(row: dict[str, Any], player: str) -> float | None:
    """Extract a numeric score for `player` from a dimension row.

    Handles multiple schema variants:
        row.cells = [{"player": "x", "score": 80}, ...]
        row.scores = {"x": 80, ...}
        row.{player_id} = 80  (flat)
    """
    cells = row.get("cells")
    if isinstance(cells, list):
        for cell in cells:
            if cell.get("player") == player:
                v = cell.get("score")
                return float(v) if v is not None else None
    scores = row.get("scores")
    if isinstance(scores, dict) and player in scores:
        v = scores[player]
        return float(v) if v is not None else None
    if player in row and isinstance(row[player], (int, float)):
        return float(row[player])
    return None


def compute_duel(a: str, b: str, rows: list[dict[str, Any]], include_breakdown: bool) -> dict[str, Any]:
    """Compute a single duel A vs B by counting wins per microdim."""
    wins_a = 0
    wins_b = 0
    ties = 0
    breakdown: list[dict[str, Any]] = []

    for row in rows:
        sa = get_cell_score(row, a)
        sb = get_cell_score(row, b)
        if sa is None or sb is None:
            continue
        if sa > sb:
            wins_a += 1
            winner = "a"
        elif sb > sa:
            wins_b += 1
            winner = "b"
        else:
            ties += 1
            winner = "tie"
        if include_breakdown:
            breakdown.append({
                "microdim_id": row.get("id") or row.get("dimension") or row.get("label", "?"),
                "score_a": sa,
                "score_b": sb,
                "winner": winner,
            })

    if wins_a > wins_b:
        verdict = "A wins"
    elif wins_b > wins_a:
        verdict = "B wins"
    else:
        verdict = "tie"

    result: dict[str, Any] = {
        "a": a,
        "b": b,
        "winsA": wins_a,
        "winsB": wins_b,
        "ties": ties,
        "verdict": verdict,
    }
    if include_breakdown:
        result["microdim_breakdown"] = breakdown
    return result


def build_all_pairs_duels(players: list[str], rows: list[dict[str, Any]], include_breakdown: bool = True) -> list[dict[str, Any]]:
    """Generate N choose 2 duels for all unique player pairs."""
    duels: list[dict[str, Any]] = []
    for a, b in itertools.combinations(players, 2):
        duels.append(compute_duel(a, b, rows, include_breakdown))
    return duels


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bench-dir", required=True, type=Path, help="Path to docs/bench/{YYYY-MM-DD}-{slug}/")
    parser.add_argument(
        "--no-breakdown",
        action="store_true",
        help="Omit microdim_breakdown for smaller output (default: include breakdown).",
    )
    args = parser.parse_args()

    bench_dir: Path = args.bench_dir.resolve()
    if not bench_dir.is_dir():
        sys.stderr.write(f"ERROR: bench-dir not found: {bench_dir}\n")
        return 3

    matrix = load_matrix(bench_dir / "comparison-matrix.json")
    players = extract_players(matrix, bench_dir)
    if not players:
        sys.stderr.write("ERROR: no players found in comparison-matrix.json or players.yaml\n")
        return 2

    rows = extract_dimension_rows(matrix)
    if not rows:
        sys.stderr.write("WARNING: no dimension rows found in comparison-matrix.json — duels will be empty\n")

    duels = build_all_pairs_duels(players, rows, include_breakdown=not args.no_breakdown)

    out_path = bench_dir / "duels.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump({"players": players, "count": len(duels), "duels": duels}, f, indent=2, ensure_ascii=False)

    print(f"✓ Emitted {len(duels)} duels for {len(players)} players to {out_path}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
