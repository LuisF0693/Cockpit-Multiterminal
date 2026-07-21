#!/usr/bin/env python3
"""ux_patterns_extractor.py — extracts UX pattern lists → ux-patterns.yaml.

QF-D3: artifact-first UX patterns catalog. Inspired by §5 "Padrões UX
Reutilizáveis" of 02-research-report.md and similar sections in followups.

What it does
------------
Walks 02-research-report.md and any 04..NN-followup files; looks for H2 sections
whose title matches /(?:padr(?:ã|a)o|pattern)s?/i and contains a numbered list
following the canonical template:

    N. **Pattern Name:** Description. Reference: ...

Emits a YAML catalog:

  schema_version: "1.0"
  research_slug: "..."
  generator: tech-research/ux_patterns_extractor.py
  generated_at: "<ISO date>"
  patterns:
    - id: pattern-001
      number: 1
      name: "Timeline diagnóstica"
      description: "turn → tool call → file write → phase result. Cogpit é a referência mais clara."
      reference: "Cogpit"
      section: "5. Padrões UX Reutilizáveis"
      first_seen_in: "02-research-report.md"
  totals:
    total: N
    by_section: {...}

Filesystem-first. Zero LLM. Zero network. Idempotent (atomic write).

Usage
-----
  python3 ux_patterns_extractor.py <output_dir>
  python3 ux_patterns_extractor.py <output_dir> --check
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
_PATTERN_SECTION_RE = re.compile(r"padr(?:[õo]es|[ãa]o)|pattern", re.IGNORECASE)
_NUMBERED_BOLD_RE = re.compile(
    r"^(\d+)\.\s+\*\*([^*]+?):\*\*\s*(.+?)\s*$"
)


def _read_text(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None


def _extract_reference(description: str) -> str | None:
    """Pull a probable reference name from the description."""
    # Look for "Reference: ... " or "É a referência ..."
    ref_match = re.search(r"(?:Reference|Refer[êe]ncia):\s*([^.]+)", description, re.IGNORECASE)
    if ref_match:
        return ref_match.group(1).strip().rstrip(".")
    # Look for capitalized proper noun(s) at end of sentence
    nouns = re.findall(r"\b([A-Z][a-zA-Z]+(?:/[A-Za-z0-9-]+)?)\b", description)
    # Filter common stopwords/section names
    blacklist = {"Para", "Esta", "É", "Cogpit", "Sinkra"}
    candidates = [n for n in nouns if n not in blacklist and len(n) > 2]
    return candidates[0] if candidates else None


def _extract_patterns_from_section(section_lines: list[str], section_title: str, file_label: str) -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    for line in section_lines:
        m = _NUMBERED_BOLD_RE.match(line.strip())
        if not m:
            continue
        number, name, description = m.group(1), m.group(2).strip(), m.group(3).strip()
        try:
            num = int(number)
        except ValueError:
            num = None
        patterns.append({
            "id": None,
            "number": num,
            "name": name,
            "description": description,
            "reference": _extract_reference(description),
            "section": section_title,
            "first_seen_in": file_label,
        })
    return patterns


def _walk_for_pattern_sections(text: str, file_label: str) -> list[dict[str, Any]]:
    """Find all H2 sections matching the pattern-section regex and extract from each."""
    found: list[dict[str, Any]] = []
    lines = text.split("\n")
    current_section_title: str | None = None
    current_section_lines: list[str] = []
    in_pattern_section = False

    def flush():
        if in_pattern_section and current_section_title:
            found.extend(_extract_patterns_from_section(current_section_lines, current_section_title, file_label))

    for line in lines:
        h2 = _H2_RE.match(line)
        if h2:
            flush()
            title = h2.group(1).strip()
            if _PATTERN_SECTION_RE.search(title):
                current_section_title = title
                in_pattern_section = True
                current_section_lines = []
            else:
                in_pattern_section = False
                current_section_title = None
                current_section_lines = []
            continue
        if in_pattern_section:
            current_section_lines.append(line)

    flush()
    return found


def extract_patterns(folder: Path) -> dict[str, Any]:
    slug = folder.name
    all_patterns: list[dict[str, Any]] = []

    report_text = _read_text(folder / "02-research-report.md")
    if report_text:
        all_patterns.extend(_walk_for_pattern_sections(report_text, "02-research-report.md"))

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
            all_patterns.extend(_walk_for_pattern_sections(text, fu.name))

    # Dedup by name (case-insensitive). First occurrence wins.
    seen: dict[str, dict[str, Any]] = {}
    for p in all_patterns:
        key = p["name"].lower()
        if key in seen:
            continue
        seen[key] = p

    ordered = sorted(seen.values(), key=lambda x: (x.get("number") or 999, x["name"].lower()))

    by_section: dict[str, int] = {}
    for i, p in enumerate(ordered, start=1):
        p["id"] = f"pattern-{i:03d}"
        section = p.get("section") or "unknown"
        by_section[section] = by_section.get(section, 0) + 1

    return {
        "schema_version": "1.0",
        "generator": "tech-research/ux_patterns_extractor.py",
        "research_slug": slug,
        "generated_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d"),
        "patterns": ordered,
        "totals": {
            "total": len(ordered),
            "by_section": dict(sorted(by_section.items())),
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
    parser = argparse.ArgumentParser(description="Extract ux-patterns.yaml from a research folder")
    parser.add_argument("folder", help="Path to docs/research/{date}-{slug}/")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--stdout", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        sys.stderr.write(f"error: folder not found: {folder}\n")
        return 2

    payload_obj = extract_patterns(folder)
    payload = _yaml_dump(payload_obj) + "\n"

    if args.stdout:
        sys.stdout.write(payload)
        return 0

    target = folder / "ux-patterns.yaml"
    if args.check:
        if not target.exists():
            sys.stderr.write(f"check failed: {target} missing\n")
            return 1
        if target.read_text(encoding="utf-8") != payload:
            sys.stderr.write(f"check failed: {target} is stale\n")
            return 1
        if not args.quiet:
            t = payload_obj["totals"]
            print(f"[ux-patterns-extractor] up-to-date: {t['total']} patterns across {len(t['by_section'])} sections")
        return 0

    write_atomic(target, payload)
    if not args.quiet:
        t = payload_obj["totals"]
        print(f"[ux-patterns-extractor] wrote {target}: {t['total']} patterns across {len(t['by_section'])} sections")
    return 0


if __name__ == "__main__":
    sys.exit(main())
