#!/usr/bin/env python3
"""sources_extractor.py — extract sources from 02-research-report.md into sources.yaml.

QF-4: artifact-first source manifest. Inspired by:
  - btahir/open-deep-research Knowledge Base pattern (filesystem-backed manifest)
  - §5 padrão #5 of 02-research-report.md ("Source evidence drawer")

What it does
------------
Parses 02-research-report.md (and 04..NN-followup files) and emits a YAML manifest:

  schema_version: "1.0"
  research_slug: "..."
  generator: tech-research/sources_extractor.py
  generated_at: "<ISO date>"
  sources:
    - id: src-001
      url: "https://github.com/btahir/open-deep-research"
      title: "btahir/open-deep-research"
      date: "2026"                # extracted inline ("— 2026" / "— 2026-04") or "date_unknown"
      credibility: HIGH           # via credibility_scorer.py
      multiplier: 1.3
      first_seen_in: "02-research-report.md"
      first_seen_section: "## 1. O Que Já Existe"
  totals:
    by_credibility: {HIGH: N, MEDIUM: N, LOW: N}
    with_date: N
    date_unknown: N
    total: N

Markdown patterns recognized
----------------------------
- "[Title](url) — 2026"               → date 2026
- "[Title](url) — 2026-04"            → date 2026-04
- "[Title](url) — date_unknown"       → date_unknown
- "[Title](url)"                       → date_unknown (no annotation)
- "Source: [Title](url) — YYYY"        → same as above
- Bare URLs `https://...` outside [...](...) markdown → emitted with title=domain

Usage
-----
  python3 sources_extractor.py <output_dir>            # write {output_dir}/sources.yaml
  python3 sources_extractor.py <output_dir> --check    # exit 1 if stale
  python3 sources_extractor.py <output_dir> --stdout   # print to stdout, don't write

Idempotent. Zero LLM. Zero network.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Reuse credibility scorer
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from credibility_scorer import score_credibility  # type: ignore  # noqa: E402

# Markdown link with optional inline date annotation
#   [Title](url)
#   [Title](url) — 2026
#   [Title](url) — 2026-04
#   [Title](url) — date_unknown
_MD_LINK_RE = re.compile(
    r"\[([^\]\n]+)\]\((https?://[^\s)]+)\)"
    r"(?:\s*[—–-]\s*(\d{4}(?:-\d{2})?|date_unknown))?",
    re.IGNORECASE,
)
_BARE_URL_RE = re.compile(r"(?<![\(\[])(https?://[^\s)\]<>]+)")
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)


def _domain_of(url: str) -> str:
    m = re.match(r"https?://([^/]+)", url)
    return m.group(1) if m else url


def _normalize_url(url: str) -> str:
    """Strip trailing punctuation that often hitchhikes a URL in prose."""
    while url and url[-1] in ".,;:!?":
        url = url[:-1]
    # Strip trailing closing parens that aren't part of the URL itself
    while url.endswith(")") and url.count("(") < url.count(")"):
        url = url[:-1]
    return url


def _find_section_for_position(text: str, pos: int) -> str | None:
    """Return the nearest ## or ### heading that precedes `pos`."""
    candidate = None
    for m in _HEADING_RE.finditer(text):
        if m.start() > pos:
            break
        # Prefer level-2 or level-3 headings as the "section" anchor
        if len(m.group(1)) <= 3:
            candidate = m.group(2).strip()
    return candidate


def _extract_from_text(text: str, file_label: str) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    seen_in_file: set[tuple[str, int]] = set()

    for m in _MD_LINK_RE.finditer(text):
        title = m.group(1).strip()
        url = _normalize_url(m.group(2).strip())
        date_raw = m.group(3)
        if (url, m.start()) in seen_in_file:
            continue
        seen_in_file.add((url, m.start()))
        section = _find_section_for_position(text, m.start())
        date_val = date_raw if date_raw else "date_unknown"
        found.append(
            {
                "url": url,
                "title": title,
                "date_raw": date_val,
                "first_seen_in": file_label,
                "first_seen_section": section,
                "position": m.start(),
                "kind": "markdown_link",
            }
        )

    # Bare URLs not already captured by markdown links
    captured_urls = {f["url"] for f in found}
    for m in _BARE_URL_RE.finditer(text):
        url = _normalize_url(m.group(1).strip())
        if url in captured_urls:
            continue
        if any(url.startswith(c + "://") for c in ()):
            continue
        section = _find_section_for_position(text, m.start())
        found.append(
            {
                "url": url,
                "title": _domain_of(url),
                "date_raw": "date_unknown",
                "first_seen_in": file_label,
                "first_seen_section": section,
                "position": m.start(),
                "kind": "bare_url",
            }
        )
        captured_urls.add(url)

    return found


def _read_text(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None


def extract_sources(folder: Path) -> dict[str, Any]:
    slug = folder.name
    raw_findings: list[dict[str, Any]] = []

    # Primary: 02-research-report.md
    report_text = _read_text(folder / "02-research-report.md")
    if report_text:
        raw_findings.extend(_extract_from_text(report_text, "02-research-report.md"))

    # Secondary: followup files (04..NN-*.md, sorted)
    followups = sorted(folder.glob("[0-9][0-9]-*.md"))
    for fu in followups:
        if fu.name in {"00-query-original.md", "01-deep-research-prompt.md", "02-research-report.md", "03-recommendations.md"}:
            continue
        text = _read_text(fu)
        if text:
            raw_findings.extend(_extract_from_text(text, fu.name))

    # Dedup by URL keeping the FIRST occurrence (report has priority over followups)
    seen: dict[str, dict[str, Any]] = {}
    for f in raw_findings:
        url = f["url"]
        if url in seen:
            # Improve fields if the first one was missing them
            existing = seen[url]
            if existing.get("date_raw") == "date_unknown" and f.get("date_raw") != "date_unknown":
                existing["date_raw"] = f["date_raw"]
            continue
        seen[url] = f

    # Build final entries with credibility scoring
    entries: list[dict[str, Any]] = []
    by_credibility = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    with_date = 0
    date_unknown_count = 0

    for idx, item in enumerate(sorted(seen.values(), key=lambda x: (x["first_seen_in"], x["position"])), start=1):
        date_raw = item["date_raw"]
        pub_date = None if date_raw == "date_unknown" else date_raw
        score = score_credibility(
            url=item["url"],
            title=item["title"],
            date=pub_date,
        )
        if pub_date:
            with_date += 1
        else:
            date_unknown_count += 1
        by_credibility[score["credibility"]] = by_credibility.get(score["credibility"], 0) + 1
        entries.append(
            {
                "id": f"src-{idx:03d}",
                "url": item["url"],
                "title": item["title"],
                "date": date_raw,
                "credibility": score["credibility"],
                "multiplier": score["multiplier"],
                "flags": score.get("flags", []),
                "first_seen_in": item["first_seen_in"],
                "first_seen_section": item["first_seen_section"],
                "kind": item["kind"],
            }
        )

    total = len(entries)
    payload = {
        "schema_version": "1.0",
        "generator": "tech-research/sources_extractor.py",
        "research_slug": slug,
        "generated_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d"),
        "sources": entries,
        "totals": {
            "total": total,
            "by_credibility": by_credibility,
            "with_date": with_date,
            "date_unknown": date_unknown_count,
            "date_coverage_ratio": round(with_date / total, 3) if total else 0.0,
        },
    }
    return payload


def _yaml_dump_minimal(obj: Any, indent: int = 0) -> str:
    """Tiny deterministic YAML emitter for our shape — avoids hard dep on PyYAML."""
    pad = "  " * indent
    if obj is None:
        return "null"
    if isinstance(obj, bool):
        return "true" if obj else "false"
    if isinstance(obj, (int, float)):
        return str(obj)
    if isinstance(obj, str):
        if obj == "" or any(c in obj for c in ":#&*!|>'\"%@`{}[]") or obj.strip() != obj:
            # quote and escape
            escaped = obj.replace("\\", "\\\\").replace('"', '\\"')
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
                        out.append(_yaml_dump_minimal(v, indent + 2))
                    else:
                        out.append(f"{prefix}{k}: {_yaml_dump_minimal(v)}")
            else:
                out.append(f"{pad}- {_yaml_dump_minimal(item)}")
        return "\n".join(out)
    if isinstance(obj, dict):
        if not obj:
            return "{}"
        out = []
        for k, v in obj.items():
            if isinstance(v, (dict, list)) and v not in (None, [], {}):
                out.append(f"{pad}{k}:")
                out.append(_yaml_dump_minimal(v, indent + 1))
            else:
                out.append(f"{pad}{k}: {_yaml_dump_minimal(v)}")
        return "\n".join(out)
    return str(obj)


def write_atomic(target: Path, payload: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, target)


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract sources.yaml from a research or bench folder")
    parser.add_argument("folder", help="Path to docs/research/{date}-{slug}/ or docs/bench/{date}-{slug}/")
    parser.add_argument("--check", action="store_true", help="Exit 1 if sources.yaml is stale")
    parser.add_argument("--stdout", action="store_true", help="Print to stdout instead of writing")
    parser.add_argument("--quiet", action="store_true", help="Suppress stdout summary")
    # STORY-153.6: multi-mode support
    try:
        from _mode_detector import add_mode_argument, detect_mode  # type: ignore
        add_mode_argument(parser)
        _multi_mode_available = True
    except ImportError:
        _multi_mode_available = False
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        sys.stderr.write(f"error: folder not found: {folder}\n")
        return 2

    # STORY-153.6: resolve mode (research|bench) for downstream extractors
    if _multi_mode_available:
        mode = detect_mode(folder, override=getattr(args, "mode", "auto"))
        if not args.quiet:
            sys.stderr.write(f"[sources-extractor] mode={mode.value} (folder: {folder.name})\n")

    payload_obj = extract_sources(folder)
    payload = _yaml_dump_minimal(payload_obj) + "\n"

    if args.stdout:
        sys.stdout.write(payload)
        return 0

    target = folder / "sources.yaml"
    if args.check:
        if not target.exists():
            sys.stderr.write(f"check failed: {target} missing\n")
            return 1
        if target.read_text(encoding="utf-8") != payload:
            sys.stderr.write(f"check failed: {target} is stale\n")
            return 1
        if not args.quiet:
            totals = payload_obj["totals"]
            print(f"[sources-extractor] up-to-date: {totals['total']} sources "
                  f"({totals['by_credibility']['HIGH']}H/{totals['by_credibility']['MEDIUM']}M/{totals['by_credibility']['LOW']}L), "
                  f"{totals['with_date']}/{totals['total']} dated")
        return 0

    write_atomic(target, payload)
    if not args.quiet:
        totals = payload_obj["totals"]
        print(f"[sources-extractor] wrote {target}: {totals['total']} sources "
              f"({totals['by_credibility']['HIGH']}H/{totals['by_credibility']['MEDIUM']}M/{totals['by_credibility']['LOW']}L), "
              f"{totals['with_date']}/{totals['total']} dated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
