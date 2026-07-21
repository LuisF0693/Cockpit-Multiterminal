#!/usr/bin/env python3
"""comparison_matrix_extractor.py — extracts markdown comparison tables → matrices.yaml.

QF-D2: artifact-first matrix manifest. Inspired by §4 "Matriz: Fase x Prior-Art"
of 02-research-report.md and similar comparison tables across other researches.

What it does
------------
Walks 02-research-report.md and any 04..NN-followup files; for each `## N. ...`
section that contains a markdown table with >= 2 rows, emits a structured matrix:

  schema_version: "1.0"
  research_slug: "..."
  generator: tech-research/comparison_matrix_extractor.py
  generated_at: "<ISO date>"
  matrices:
    - id: matrix-001
      title: "Matriz: Fase do `/tech-research` x Prior-Art"
      section: "4. Matriz: ..."
      first_seen_in: "02-research-report.md"
      columns: ["Fase Sinkra", "Melhor prior-art", "Visualização existente", "Gap para Sinkra"]
      cells:
        - { "Fase Sinkra": "Auto-Clarify", "Melhor prior-art": "fdarkaou/...", ... }
  totals:
    total_matrices: N
    total_rows: N

Heuristics:
  - A "comparison matrix" is any markdown table directly under a `## N. ...`
    heading. Inline tables in player blocks (### N.N) are ignored.
  - Header row + separator row + >=2 data rows.

Filesystem-first. Zero LLM. Zero network. Idempotent (atomic write).

Usage
-----
  python3 comparison_matrix_extractor.py <output_dir>
  python3 comparison_matrix_extractor.py <output_dir> --check
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_H2_RE = re.compile(r"^##\s+(.+?)\s*$")
_H3_RE = re.compile(r"^###\s+")
_TABLE_ROW_RE = re.compile(r"^\|(.+)\|\s*$")
_SEPARATOR_RE = re.compile(r"^\|[\s:-]+\|[\s:|-]*$")


def _read_text(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None


def _split_row(row_line: str) -> list[str]:
    """Split a markdown table row into trimmed cells. Drops leading/trailing pipes."""
    inner = row_line.strip()
    if inner.startswith("|"):
        inner = inner[1:]
    if inner.endswith("|"):
        inner = inner[:-1]
    return [cell.strip() for cell in inner.split("|")]


def _extract_tables_from_text(text: str, file_label: str) -> list[dict[str, Any]]:
    """Walk text line-by-line, anchoring tables to their nearest H2 heading."""
    tables: list[dict[str, Any]] = []
    lines = text.split("\n")

    current_h2: str | None = None
    current_h2_number: str | None = None
    in_h3 = False  # ignore tables inside ### blocks (player blocks)
    i = 0
    while i < len(lines):
        line = lines[i]

        h2 = _H2_RE.match(line)
        if h2:
            current_h2 = h2.group(1).strip()
            in_h3 = False
            num_match = re.match(r"^(\d+)\.\s*(.+)$", current_h2)
            current_h2_number = num_match.group(1) if num_match else None
            i += 1
            continue

        if _H3_RE.match(line):
            in_h3 = True
            i += 1
            continue

        if in_h3 or not current_h2:
            i += 1
            continue

        if _TABLE_ROW_RE.match(line):
            # Possible table start: this is the header row.
            if i + 1 >= len(lines):
                i += 1
                continue
            sep_line = lines[i + 1]
            if not _SEPARATOR_RE.match(sep_line):
                i += 1
                continue

            header = _split_row(line)
            data_start = i + 2
            data_rows: list[list[str]] = []
            j = data_start
            while j < len(lines) and _TABLE_ROW_RE.match(lines[j]):
                data_rows.append(_split_row(lines[j]))
                j += 1

            if len(data_rows) >= 2 and header:
                cells = []
                for row in data_rows:
                    record: dict[str, str] = {}
                    for col_idx, header_name in enumerate(header):
                        value = row[col_idx] if col_idx < len(row) else ""
                        record[header_name] = value
                    cells.append(record)
                tables.append({
                    "id": None,  # assigned in caller
                    "title": current_h2,
                    "section_number": current_h2_number,
                    "first_seen_in": file_label,
                    "columns": header,
                    "row_count": len(cells),
                    "cells": cells,
                })

            i = j  # skip past the consumed table
            continue

        i += 1

    return tables


def _derive_confidence(folder: Path) -> str:
    """Derive confidence level from metrics.yaml coverage_score if available."""
    metrics_path = folder / "metrics.yaml"
    if not metrics_path.exists():
        return "medium"
    try:
        import yaml as _yaml
        data = _yaml.safe_load(metrics_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return "medium"
        score = data.get("coverage_score") or data.get("confidence_score")
        if score is None:
            return "medium"
        score = float(score)
        if score >= 90:
            return "high"
        if score >= 70:
            return "medium"
        return "low"
    except Exception:
        return "medium"


def extract_matrices(folder: Path) -> dict[str, Any]:
    slug = folder.name
    found: list[dict[str, Any]] = []
    evidence_refs: list[str] = []

    report_text = _read_text(folder / "02-research-report.md")
    if report_text:
        found.extend(_extract_tables_from_text(report_text, "02-research-report.md"))
        evidence_refs.append("02-research-report.md")

    followups = sorted(folder.glob("[0-9][0-9]-*.md"))
    canonical = {
        "00-query-original.md",
        "01-deep-research-prompt.md",
        "02-research-report.md",
        "03-recommendations.md",
    }
    for fu in followups:
        if fu.name in canonical:
            continue
        text = _read_text(fu)
        if text:
            found.extend(_extract_tables_from_text(text, fu.name))
            evidence_refs.append(fu.name)

    # Assign canonical ids and compute totals
    total_rows = 0
    for idx, t in enumerate(found, start=1):
        t["id"] = f"matrix-{idx:03d}"
        total_rows += t.get("row_count", 0)

    confidence = _derive_confidence(folder)

    return {
        "schema_version": "1.0",
        "generator": "tech-research/comparison_matrix_extractor.py",
        "research_slug": slug,
        "generated_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d"),
        "derived_from_research": True,
        "evidence_refs": evidence_refs,
        "confidence": confidence,
        "limitations": [
            "captures only markdown tables directly under ## headings; inline tables in ### player blocks are intentionally excluded",
            "table quality depends on consistent markdown formatting in the report",
            "no semantic weighting — all tables are treated as equal comparison matrices",
        ],
        "matrices": found,
        "totals": {
            "total_matrices": len(found),
            "total_rows": total_rows,
        },
    }


def _yaml_dump(obj: Any, indent: int = 0) -> str:
    pad = "  " * indent
    if obj is None:
        return "null"
    if isinstance(obj, bool):
        return "true" if obj else "false"
    if isinstance(obj, (int, float)):
        return str(obj)
    if isinstance(obj, str):
        if obj == "" or any(c in obj for c in ":#&*!|>'\"%@`{}[]") or obj.strip() != obj or "\n" in obj:
            escaped = obj.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
            return f'"{escaped}"'
        return obj
    if isinstance(obj, list):
        if not obj:
            return "[]"
        out = []
        for item in obj:
            if isinstance(item, dict):
                first = True
                for k, v in item.items():
                    prefix = f"{pad}- " if first else f"{pad}  "
                    first = False
                    if isinstance(v, (dict, list)) and v not in (None, [], {}):
                        out.append(f"{prefix}{k}:")
                        out.append(_yaml_dump(v, indent + 2))
                    else:
                        out.append(f"{prefix}{k}: {_yaml_dump(v)}")
            else:
                out.append(f"{pad}- {_yaml_dump(item)}")
        return "\n".join(out)
    if isinstance(obj, dict):
        if not obj:
            return "{}"
        out = []
        for k, v in obj.items():
            if isinstance(v, (dict, list)) and v not in (None, [], {}):
                out.append(f"{pad}{k}:")
                out.append(_yaml_dump(v, indent + 1))
            else:
                out.append(f"{pad}{k}: {_yaml_dump(v)}")
        return "\n".join(out)
    return str(obj)


def write_atomic(target: Path, payload: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, target)


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract matrices.yaml from a research or bench folder")
    parser.add_argument("folder", help="Path to docs/research/{date}-{slug}/ or docs/bench/{date}-{slug}/")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--stdout", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    # STORY-153.6: multi-mode support
    try:
        from _mode_detector import add_mode_argument, detect_mode  # type: ignore
        add_mode_argument(parser)
        _multi_mode = True
    except ImportError:
        _multi_mode = False
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        sys.stderr.write(f"error: folder not found: {folder}\n")
        return 2

    if _multi_mode and not args.quiet:
        mode = detect_mode(folder, override=getattr(args, "mode", "auto"))
        sys.stderr.write(f"[comparison-matrix-extractor] mode={mode.value} (folder: {folder.name})\n")

    payload_obj = extract_matrices(folder)
    payload = _yaml_dump(payload_obj) + "\n"

    if args.stdout:
        sys.stdout.write(payload)
        return 0

    target = folder / "matrices.yaml"
    if args.check:
        if not target.exists():
            sys.stderr.write(f"check failed: {target} missing\n")
            return 1
        if target.read_text(encoding="utf-8") != payload:
            sys.stderr.write(f"check failed: {target} is stale\n")
            return 1
        if not args.quiet:
            t = payload_obj["totals"]
            print(f"[matrix-extractor] up-to-date: {t['total_matrices']} matrices, {t['total_rows']} rows")
        return 0

    write_atomic(target, payload)
    if not args.quiet:
        t = payload_obj["totals"]
        print(f"[matrix-extractor] wrote {target}: {t['total_matrices']} matrices, {t['total_rows']} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
