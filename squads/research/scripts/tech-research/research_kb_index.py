#!/usr/bin/env python3
"""Knowledge Base Index — scans docs/research/* and emits a cross-research index.

Inspired by the Knowledge Base sidebar pattern in btahir/open-deep-research
(see docs/research/2026-05-11-visual-deep-research-apps/02-research-report.md §1.1).
We persist on filesystem (markdown + YAML) instead of browser localStorage.

Behavior:
  - Scans every immediate subdirectory of docs/research/ that has a README.md
    and either metrics.yaml or pipeline-state.yaml.
  - Extracts slug, topic, date, coverage, sources, decision, status.
  - Writes docs/research/_index.json (atomic write: tmp + os.replace).
  - Idempotent: same input → same output. Safe to run repeatedly.
  - Deterministic: no LLM, no network, no clock-dependent fields.

Usage:
  python3 squads/research/scripts/tech-research/research_kb_index.py
  python3 squads/research/scripts/tech-research/research_kb_index.py --root docs/research
  python3 squads/research/scripts/tech-research/research_kb_index.py --check  # exit 1 if drift

Exit codes:
  0 = index written (or already current with --check)
  1 = --check and index is stale (CI guard)
  2 = invalid input / missing root
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


def _read_yaml_minimal(path: Path) -> dict[str, Any]:
    """Minimal YAML reader for our metrics.yaml/pipeline-state.yaml shape.

    Avoids hard dep on PyYAML. Handles only:
      - top-level scalar: key: value
      - top-level nested 1-level: key:\n  child: value
      - quoted strings, unquoted strings, ints, floats, bool, null, percentage suffix
    Returns flat-ish dict; nested objects become dicts.
    """
    data: dict[str, Any] = {}
    if not path.exists():
        return data
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return data

    current_parent: str | None = None
    parent_dict: dict[str, Any] | None = None

    for raw in lines:
        line = raw.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue

        # Two-space indented child: " <key>: <value>"
        if line.startswith("  ") and current_parent is not None and parent_dict is not None:
            stripped = line.strip()
            if ":" in stripped:
                k, _, v = stripped.partition(":")
                parent_dict[k.strip()] = _coerce_scalar(v.strip())
            continue

        # Top-level
        if not line.startswith(" "):
            if ":" not in line:
                continue
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            if val == "":
                # Open nested block
                current_parent = key
                parent_dict = {}
                data[key] = parent_dict
            else:
                data[key] = _coerce_scalar(val)
                current_parent = None
                parent_dict = None

    return data


def _coerce_scalar(v: str) -> Any:
    if v == "" or v.lower() == "null":
        return None
    if v.lower() == "true":
        return True
    if v.lower() == "false":
        return False
    # quoted string
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        return v[1:-1]
    # percentage
    if v.endswith("%"):
        try:
            return float(v[:-1])
        except ValueError:
            return v
    # int / float
    try:
        if "." in v:
            return float(v)
        return int(v)
    except ValueError:
        return v


_TOPIC_RE = re.compile(r"^>\s*\*\*Tópico:\*\*\s*(.+?)\s*$", re.MULTILINE)
_SHORT_TITLE_RE = re.compile(r"^>\s*\*\*T[óo]pico curto:\*\*\s*(.+?)\s*$", re.MULTILINE)
_CATEGORY_RE = re.compile(r"^>\s*\*\*Categoria:\*\*\s*(.+?)\s*$", re.MULTILINE)
_DATE_RE = re.compile(r"^>\s*\*\*Data:\*\*\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*$", re.MULTILINE)
_FOLDER_DATE_RE = re.compile(r"^([0-9]{4}-[0-9]{2}-[0-9]{2})-(.+)$")
_TAG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_HEADING_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
_COVERAGE_RE = re.compile(r"coverage(?:_score|\s+score)?\s*[:=]?\s*(\d{1,3})", re.IGNORECASE)
_SOURCES_RE = re.compile(r"sources?\s*[:=]?\s*(\d+)\s+(?:total\s+)?(?:sources?)?", re.IGNORECASE)
_DECISION_RE = re.compile(r"\b(STOP|CONTINUE|HALT)\b")

# Display title constraints
DISPLAY_TITLE_MAX = 60
DISPLAY_TITLE_MIN_SHORT = 15

# Cosmetic prefix strips: codification tags and meta-redundancy that pollute UI display titles.
# Applied in order; each pattern is a single non-recursive strip from the left.
_TITLE_PREFIX_STRIPS = [
    re.compile(r"^TR[-_]?D?\d+\s*[—–\-:]+\s*", re.IGNORECASE),                          # TR-D7 —, TR-7:, TR-3 --, TR-1:
    re.compile(r"^Tech[-_\s]+Research\s*[—–\-:]+\s*", re.IGNORECASE),                   # Tech Research:
    re.compile(r"^Research\s*[—–\-:]+\s*", re.IGNORECASE),                              # Research: / Research — / Research -
    re.compile(r"^Pesquisa\s*[—–\-:]+\s*", re.IGNORECASE),                              # Pesquisa:
    re.compile(r"^Investigation\s*[—–\-:]+\s*", re.IGNORECASE),                         # Investigation:
    # Final pass: orphan leading dash/em-dash that survived prior strips
    re.compile(r"^[—–\-]+\s*", re.IGNORECASE),
]


def clean_title_prefixes(title: str) -> str:
    """Strip cosmetic codification prefixes (TR-D7 —, Research:, etc.) from a title.

    Idempotent: running twice yields the same result. Single-pass left-only strip.
    """
    if not title:
        return title
    result = title.strip()
    # Also strip backticks/markdown leftovers that pollute the display
    result = result.strip("`").strip()
    for pattern in _TITLE_PREFIX_STRIPS:
        new = pattern.sub("", result, count=1)
        if new != result:
            result = new.strip()
            # Don't break — let subsequent patterns clean stacked prefixes
    # Remove stray backticks anywhere in the title (e.g. `LLM Evals ... no \`/design-md\``)
    result = result.replace("`", "")
    return result.strip()

# Category taxonomy — 11 global categories
# Rules are evaluated in order; first match wins. Slug = matched against slug+topic+tags joined.
CATEGORY_TAXONOMY = [
    "ai-agents",
    "ai-tools",
    "ux-ui",
    "harness",
    "content",
    "devops",
    "database",
    "business",
    "frontend",
    "knowledge",
    "other",
]
CATEGORY_RULES: list[tuple[re.Pattern[str], str]] = [
    # AI categories first (more specific). Hyphen/underscore-insensitive via [-_\s] in critical spots.
    (re.compile(r"(tr-?d?\d|agent[-_\s]?(architect|memory|runtime|communicat|team|heuristic)|sandbox|multi[-_\s]?agent|durable[-_\s]?execut|entity[-_\s]?centric|\bswarm\b|cognitive[-_\s]?clon|mmos)", re.IGNORECASE), "ai-agents"),
    (re.compile(r"(llm[-_\s]?(router|eval|output|pipeline|structured|model)|openrouter|prompt[-_\s]?op|prompt[-_\s]?engineer|context[-_\s]?(budget|inject|engineering|scoped|loading)|heuristic[-_\s]?extract|embedding|\brag\b|model[-_\s]?compar|autonomous[-_\s]?(llm|runner)|llm[-_\s]?system|validate[-_\s]?parity|claude[-_\s]?skill)", re.IGNORECASE), "ai-tools"),
    # Domain categories
    (re.compile(r"(design[-_\s]?md|atomic[-_\s]?design|design[-_\s]?system|brand|design[-_\s]?ops|ds[-_\s]?token|ui[-_\s]?ux|component[-_\s]?librar|figma|theme|\bdashboard\b|observator|claude[-_\s]?design)", re.IGNORECASE), "ux-ui"),
    (re.compile(r"(database|supabase|postgres|pgvector|migration|\brls\b|\bschema\b)", re.IGNORECASE), "database"),
    (re.compile(r"(ci[-_\s]?cd|\bdeploy\b|github[-_\s]?action|\brelease\b|infra[-_\s]?deploy|monorepo|toolchain)", re.IGNORECASE), "devops"),
    (re.compile(r"(harness|runner[-_\s]?lib|orchestrat|tech[-_\s]?research|deep[-_\s]?research[-_\s]?pipeline|decoder[-_\s]?pipeline|neural[-_\s]?pattern|artifact[-_\s]?path|telegram[-_\s]?integration|feedback[-_\s]?skill|oss[-_\s]?docs|similar[-_\s]?solut|aigrowthagent|seomachine|arscontexta)", re.IGNORECASE), "harness"),
    # Content / business / frontend
    (re.compile(r"(content[-_\s]?geo|geo[-_\s]?content|founder[-_\s]?interview|\bugc\b|writing[-_\s]?style|ai[-_\s]?speak|blog[-_\s]?image|channel[-_\s]?(to[-_\s]?)?geo|seo[-_\s]?semantic|copy[-_\s]?writ|video[-_\s]?editor|course[-_\s]?creator|transcript[-_\s]?match)", re.IGNORECASE), "content"),
    (re.compile(r"(business|pricing|\boffer\b|hormozi|sales|lead[-_\s]?tool|b2b|\bgrant\b|omnichannel|helpdesk|market[-_\s]?analys|imobili)", re.IGNORECASE), "business"),
    (re.compile(r"(tailwind|shadcn|astro|next[-_\s]?js|react[-_\s]?first|cms[-_\s]?stack|stack[-_\s]?analys|\bv0\b|lovable|frontend[-_\s]?alternat)", re.IGNORECASE), "frontend"),
    # Knowledge / methodology last
    (re.compile(r"(deep[-_\s]?research|research[-_\s]?pipeline|knowledge|vault|citation|methodology|token[-_\s]?hygiene|aios|sinkra[-_\s]?aiox|best[-_\s]?practices)", re.IGNORECASE), "knowledge"),
]


def derive_category(slug: str, topic: str | None, tags: list[str] | None) -> tuple[str, bool]:
    """Return (category, inferred). inferred=True unless author declared canonical."""
    haystack_parts: list[str] = [slug]
    if topic:
        haystack_parts.append(topic)
    if tags:
        haystack_parts.extend(tags)
    haystack = " ".join(haystack_parts).lower()
    for pattern, category in CATEGORY_RULES:
        if pattern.search(haystack):
            return category, True
    return "other", True


def _canonical_category(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower().replace(" ", "-").replace("/", "-")
    return cleaned if cleaned in CATEGORY_TAXONOMY else None
# Delimiters tried in order to find a natural cut point.
# Comma and colon first because they usually separate the "name" from
# the qualifier; em-dash and hyphen last because they often join name+subtitle
# (e.g. "TR-D7 — Real-Time Agent Streaming...").
_TITLE_DELIMITERS = [",", ":", " — ", " – ", " - "]


def derive_display_title(topic: str | None) -> tuple[str | None, bool]:
    """Derive a short display title from a free-form topic string.

    Returns (display_title, inferred).
      - inferred=False only when the input itself is already short (<= MAX) AND
        no cosmetic prefix had to be stripped.
      - inferred=True when truncation/heuristic cut or prefix strip was applied.
      - returns (None, False) when topic is empty.

    Strategy:
      1. Strip cosmetic prefixes (TR-D7 —, Research:, backticks, etc.)
      2. If clean topic <= MAX → return as-is (inferred=True only if a strip occurred).
      3. Try each delimiter; the first split that yields a left part
         between MIN_SHORT and MAX chars wins.
      4. Otherwise, hard truncate at MAX with an ellipsis at word boundary.
    """
    if not topic:
        return None, False
    original = topic.strip()
    cleaned = clean_title_prefixes(original)
    if not cleaned:
        return None, False
    prefix_was_stripped = cleaned != original
    if len(cleaned) <= DISPLAY_TITLE_MAX:
        return cleaned, prefix_was_stripped
    topic = cleaned
    for delim in _TITLE_DELIMITERS:
        if delim in topic:
            short = topic.split(delim, 1)[0].strip()
            if DISPLAY_TITLE_MIN_SHORT <= len(short) <= DISPLAY_TITLE_MAX:
                return short, True
    # Hard truncate at word boundary
    truncated = topic[:DISPLAY_TITLE_MAX].rsplit(" ", 1)[0]
    if not truncated or len(truncated) < DISPLAY_TITLE_MIN_SHORT:
        truncated = topic[:DISPLAY_TITLE_MAX]
    return f"{truncated}…", True


def _humanize_slug(slug: str) -> str:
    """Convert "2026-05-07-codex-path-scoped-context-loading" → "Codex Path Scoped Context Loading"."""
    body = slug
    folder_match = _FOLDER_DATE_RE.match(slug)
    if folder_match:
        body = folder_match.group(2)
    words = [w for w in body.split("-") if w]
    return " ".join(w.capitalize() for w in words) if words else slug


def _first_heading(text: str) -> str | None:
    match = _HEADING_RE.search(text)
    return match.group(1).strip() if match else None


def _extract_topic_and_date(readme_path: Path) -> tuple[str | None, str | None, str | None, str | None]:
    """Return (topic, date, short_title_canonical, category_canonical) from README front-matter.

    short_title_canonical and category_canonical are values explicitly declared
    in the blockquote (`**Tópico curto:**`, `**Categoria:**`); None otherwise.
    Callers fall back to derive_display_title / derive_category when None.
    """
    if not readme_path.exists():
        return None, None, None, None
    try:
        text = readme_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None, None, None, None
    topic_match = _TOPIC_RE.search(text)
    date_match = _DATE_RE.search(text)
    short_match = _SHORT_TITLE_RE.search(text)
    category_match = _CATEGORY_RE.search(text)
    topic = topic_match.group(1).strip() if topic_match else None
    date = date_match.group(1).strip() if date_match else None
    short = short_match.group(1).strip() if short_match else None
    category = _canonical_category(category_match.group(1) if category_match else None)
    return topic, date, short, category


def _read_text_safe(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None


def _earliest_mtime(folder: Path) -> str | None:
    """Return ISO-8601 date of the oldest file mtime in the folder (proxy for created_at)."""
    try:
        files = [f for f in folder.iterdir() if f.is_file()]
        if not files:
            return None
        oldest = min(f.stat().st_mtime for f in files)
        from datetime import datetime, timezone
        return datetime.fromtimestamp(oldest, tz=timezone.utc).strftime("%Y-%m-%d")
    except OSError:
        return None


def _latest_mtime(folder: Path) -> str | None:
    try:
        files = [f for f in folder.iterdir() if f.is_file()]
        if not files:
            return None
        latest = max(f.stat().st_mtime for f in files)
        from datetime import datetime, timezone
        return datetime.fromtimestamp(latest, tz=timezone.utc).strftime("%Y-%m-%d")
    except OSError:
        return None


def _derive_tags_from_slug(slug: str) -> list[str]:
    body = slug
    folder_match = _FOLDER_DATE_RE.match(slug)
    if folder_match:
        body = folder_match.group(2)
    tokens = [t for t in _TAG_RE.findall(body) if len(t) >= 3]
    # Dedup preserving order
    seen: set[str] = set()
    out: list[str] = []
    for t in tokens:
        if t not in seen:
            seen.add(t)
            out.append(t)
    return out[:8]  # cap


def _scan_folder(folder: Path) -> dict[str, Any] | None:
    """Scan a research folder with QF-3.1 fallback chain.

    Strategy per field:
      date: README **Data:** → folder name (YYYY-MM-DD-...) → earliest mtime
      topic: README **Tópico:** → first # heading in README → humanized slug
      coverage_score: metrics.yaml → regex in README → regex in any *.md
      sources_total: metrics.yaml.sources.total → regex in README → count refs in 02-report
      decision: metrics.yaml.decision → regex STOP/CONTINUE in README → wave-summary scan
      status: pipeline-state.yaml.status → presence of 02-report → "draft"

    `inferred` map tracks which fields came from fallback (true) vs canonical (false).
    Folder is included if README.md exists OR at least one numbered .md exists.
    """
    readme = folder / "README.md"
    metrics = folder / "metrics.yaml"
    pipeline = folder / "pipeline-state.yaml"
    report = folder / "02-research-report.md"
    query = folder / "00-query-original.md"

    has_any_artifact = readme.exists() or report.exists() or query.exists()
    if not has_any_artifact:
        return None

    slug = folder.name
    folder_match = _FOLDER_DATE_RE.match(slug)
    folder_date = folder_match.group(1) if folder_match else None

    readme_text = _read_text_safe(readme) or ""
    if readme.exists():
        topic_canonical, date_canonical, short_canonical, category_canonical = _extract_topic_and_date(readme)
    else:
        topic_canonical, date_canonical, short_canonical, category_canonical = None, None, None, None

    metrics_data = _read_yaml_minimal(metrics)
    pipeline_data = _read_yaml_minimal(pipeline)
    sources_block = metrics_data.get("sources") if isinstance(metrics_data.get("sources"), dict) else {}

    inferred: dict[str, bool] = {}

    # date: canonical → folder name → earliest mtime
    if date_canonical:
        date_val = date_canonical
        inferred["date"] = False
    elif folder_date:
        date_val = folder_date
        inferred["date"] = True
    else:
        date_val = _earliest_mtime(folder)
        inferred["date"] = True if date_val else False

    # topic: canonical README → first # heading → humanized slug
    if topic_canonical:
        topic_val = topic_canonical
        inferred["topic"] = False
    else:
        heading = _first_heading(readme_text) if readme_text else None
        if heading:
            topic_val = heading
            inferred["topic"] = True
        else:
            topic_val = _humanize_slug(slug)
            inferred["topic"] = True

    # display_title: canonical `**Tópico curto:**` → derived from topic → topic_val itself
    if short_canonical:
        display_title_val: str | None = short_canonical
        inferred["display_title"] = False
    else:
        derived, was_inferred = derive_display_title(topic_val)
        display_title_val = derived
        # display_title is inferred whenever topic itself was inferred OR when
        # derivation actually altered the original topic string.
        inferred["display_title"] = bool(inferred.get("topic")) or was_inferred

    # coverage_score: metrics.yaml → regex in README → regex in 02-report
    if metrics_data.get("coverage_score") is not None:
        coverage_val = metrics_data.get("coverage_score")
        inferred["coverage_score"] = False
    else:
        cov_match = _COVERAGE_RE.search(readme_text)
        if cov_match:
            try:
                coverage_val = int(cov_match.group(1))
                inferred["coverage_score"] = True
            except ValueError:
                coverage_val = None
                inferred["coverage_score"] = False
        else:
            report_text = _read_text_safe(report) or ""
            cov2 = _COVERAGE_RE.search(report_text)
            if cov2:
                try:
                    coverage_val = int(cov2.group(1))
                    inferred["coverage_score"] = True
                except ValueError:
                    coverage_val = None
                    inferred["coverage_score"] = False
            else:
                coverage_val = None
                inferred["coverage_score"] = False

    # sources_total: metrics.yaml.sources.total → regex in README → count [...](http) in report refs
    if isinstance(sources_block, dict) and sources_block.get("total") is not None:
        sources_val = sources_block.get("total")
        inferred["sources_total"] = False
    else:
        src_match = _SOURCES_RE.search(readme_text)
        if src_match:
            try:
                sources_val = int(src_match.group(1))
                inferred["sources_total"] = True
            except ValueError:
                sources_val = None
                inferred["sources_total"] = False
        else:
            report_text = _read_text_safe(report) or ""
            # Count distinct http URLs in the references-like region
            urls = set(re.findall(r"https?://[^\s)\]]+", report_text))
            if urls:
                sources_val = len(urls)
                inferred["sources_total"] = True
            else:
                sources_val = None
                inferred["sources_total"] = False

    # decision: metrics.yaml → regex in README → wave summaries scan
    if metrics_data.get("decision"):
        decision_val = metrics_data.get("decision")
        inferred["decision"] = False
    else:
        dec_match = _DECISION_RE.search(readme_text)
        if dec_match:
            decision_val = dec_match.group(1).upper()
            inferred["decision"] = True
        else:
            decision_val = None
            for wave in folder.glob("wave-*-summary.md"):
                w_text = _read_text_safe(wave) or ""
                w_match = _DECISION_RE.search(w_text)
                if w_match:
                    decision_val = w_match.group(1).upper()
                    inferred["decision"] = True
                    break
            if decision_val is None:
                inferred["decision"] = False

    # status: pipeline-state.yaml → has 02-report → draft if only 00 → null
    if pipeline_data.get("status"):
        status_val = pipeline_data.get("status")
        inferred["status"] = False
    elif report.exists():
        status_val = "completed"
        inferred["status"] = True
    elif query.exists():
        status_val = "draft"
        inferred["status"] = True
    else:
        status_val = None
        inferred["status"] = False

    tags = _derive_tags_from_slug(slug)

    # category: canonical README → heuristic
    if category_canonical:
        category_val = category_canonical
        inferred["category"] = False
    else:
        category_val, was_inferred = derive_category(slug, topic_val, tags)
        inferred["category"] = was_inferred

    waves_raw = metrics_data.get("waves")
    if isinstance(waves_raw, list):
        waves_val = len(waves_raw)
    elif isinstance(waves_raw, (int, float)):
        waves_val = int(waves_raw)
    elif isinstance(waves_raw, str) and waves_raw.isdigit():
        waves_val = int(waves_raw)
    else:
        waves_val = len(list(folder.glob("wave-*-summary.md")))

    entry: dict[str, Any] = {
        "slug": slug,
        "topic": topic_val,
        "display_title": display_title_val,
        "category": category_val,
        "date": date_val,
        "coverage_score": coverage_val,
        "integrity_score": metrics_data.get("integrity_score"),
        "sources_total": sources_val,
        "waves": waves_val,
        "decision": decision_val,
        "stop_reason": metrics_data.get("stop_reason"),
        "status": status_val,
        "tags": tags,
        "created_at": _earliest_mtime(folder),
        "last_modified": _latest_mtime(folder),
        "inferred": inferred,
    }
    return entry


def build_index(root: Path) -> list[dict[str, Any]]:
    if not root.exists() or not root.is_dir():
        return []
    entries: list[dict[str, Any]] = []
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if child.name.startswith("_") or child.name.startswith("."):
            continue
        entry = _scan_folder(child)
        if entry is not None:
            entries.append(entry)
    # Sort by date desc, slug asc as tiebreaker
    entries.sort(key=lambda e: (e.get("date") or "", e.get("slug") or ""), reverse=True)
    return entries


def write_atomic(target: Path, payload: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, target)


def main() -> int:
    parser = argparse.ArgumentParser(description="Knowledge Base index for docs/research/")
    parser.add_argument(
        "--root",
        default="docs/research",
        help="Research root directory (default: docs/research)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output path (default: <root>/_index.json)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit 1 if generated content differs from current file (CI guard)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress stdout summary",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        sys.stderr.write(f"error: root not found: {root}\n")
        return 2

    output = Path(args.output).resolve() if args.output else (root / "_index.json")

    entries = build_index(root)
    payload_obj = {
        "schema_version": "1.0",
        "generator": "tech-research/research_kb_index.py",
        "root": str(root.relative_to(root.parent.parent)) if root.is_relative_to(root.parent.parent) else str(root),
        "entries": entries,
        "count": len(entries),
    }
    # Stable JSON: sorted keys, no trailing whitespace, deterministic
    payload = json.dumps(payload_obj, indent=2, sort_keys=True, ensure_ascii=False) + "\n"

    if args.check:
        if not output.exists():
            sys.stderr.write(f"check failed: {output} does not exist (run without --check to generate)\n")
            return 1
        current = output.read_text(encoding="utf-8")
        if current != payload:
            sys.stderr.write(f"check failed: {output} is stale (regenerate with research_kb_index.py)\n")
            return 1
        if not args.quiet:
            print(f"[research-kb-index] up-to-date ({len(entries)} entries)")
        return 0

    write_atomic(output, payload)
    if not args.quiet:
        print(f"[research-kb-index] wrote {output} ({len(entries)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
