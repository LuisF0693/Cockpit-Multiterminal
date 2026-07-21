#!/usr/bin/env python3
"""players_extractor.py — extracts player deep-dive blocks → players.yaml.

QF-D1: artifact-first players manifest. Inspired by:
  - btahir/open-deep-research feature catalog
  - phase-5-document.yaml "DEEP DIVES ON TOP PLAYERS" template
  - §1, §2, §3 of 02-research-report.md (16 players in this research)

What it does
------------
Parses 02-research-report.md (and any 04..NN-followup files in the same folder)
looking for the canonical deep-dive block template enforced by the skill:

  ### N.N {Player Name}
  **Tier:** 1 | 2 | 3
  **Category:** runtime | pattern | runner | ...
  **Role:** ...
  **Fit:** high | medium | low
  **Action:** ...
  **What it does:** ...
  **What it does NOT:** ...
  **Insight for this context:** ...
  **Source:** [Title](url) — YYYY

Emits a YAML manifest:

  schema_version: "1.0"
  research_slug: "..."
  generator: tech-research/players_extractor.py
  generated_at: "<ISO date>"
  players:
    - id: player-001
      number: "1.1"
      name: "btahir/open-deep-research"
      tier: 1
      category: "open-source-deep-research"
      role: "reference-implementation"
      fit: "high"
      action: "Use as a pattern source for..."
      what_it_does: "..."
      what_it_does_not: "..."
      insight: "..."
      source_title: "btahir/open-deep-research"
      source_url: "https://github.com/btahir/open-deep-research"
      source_date: "2026"
      excluded: false
      exclusion_reason: null
      first_seen_in: "02-research-report.md"
      section: "1. O Que Já Existe"
  totals:
    total: N
    by_tier: {1: N, 2: N, 3: N, ...}
    by_category: {...}
    excluded: N

Filesystem-first. Zero LLM. Zero network. Idempotent (atomic write).

Usage
-----
  python3 players_extractor.py <output_dir>
  python3 players_extractor.py <output_dir> --check
  python3 players_extractor.py <output_dir> --stdout
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Match an H3 heading that opens a player block:
#   "### 1.1 `btahir/open-deep-research`"
#   "### 2.5 CliDeck, Agent Workspace, Agent Hub e Localforge"
_PLAYER_HEADING_RE = re.compile(r"^###\s+(\d+\.\d+)\s+(.+?)\s*$", re.MULTILINE)

# Match an H2 section heading (used as `section` anchor for each player):
#   "## 1. O Que Já Existe"
_SECTION_HEADING_RE = re.compile(r"^##\s+(\d+)\.\s+(.+?)\s*$", re.MULTILINE)

# Match the four canonical bold fields. Each field body extends until the next
# blank line or the next bold-field marker or the next heading.
_FIELD_RES = {
    "tier": re.compile(r"^\*\*Tier:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "category": re.compile(r"^\*\*Category:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "role": re.compile(r"^\*\*Role:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "fit": re.compile(r"^\*\*Fit:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "action": re.compile(r"^\*\*Action:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "what_it_does": re.compile(r"^\*\*What it does:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "what_it_does_not": re.compile(r"^\*\*What it does NOT:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "insight": re.compile(r"^\*\*Insight for this context:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#)", re.MULTILINE | re.DOTALL),
    "source": re.compile(r"^\*\*Sources?:\*\*\s*(.+?)(?=\n\n|\n\*\*|\n#|\Z)", re.MULTILINE | re.DOTALL),
}

# A single source citation: "[Title](url) — 2026" or "[Title](url) — date_unknown"
_SOURCE_CITATION_RE = re.compile(
    r"\[([^\]\n]+?)\]\((https?://[^\s)]+)\)(?:\s*[—–-]\s*(\d{4}(?:-\d{2})?|date_unknown))?",
    re.IGNORECASE,
)

# Words that strongly indicate the player is flagged as EXCLUDED in prose
_EXCLUSION_TOKENS = [
    "EXCLUÍDO",
    "EXCLUIDO",
    "EXCLUDED",
    "fora do escopo",
    "user directive",
]

# Common categorization signals → category slug
_CATEGORY_RULES = [
    ("teamcreate", "reference-runtime"),
    ("agent teams", "reference-runtime"),
    ("mailbox", "reference-runtime"),
    ("runner-lib", "runner-foundation"),
    ("state manager", "runner-foundation"),
    ("bootstrap", "runner-foundation"),
    ("wave loop", "supervisor-template"),
    ("heartbeat", "supervisor-template"),
    ("codex exec", "supervisor-template"),
    ("codex subagent", "native-runtime"),
    ("subagent", "native-runtime"),
    ("agents sdk", "orchestration-pattern"),
    ("agents-as-tools", "orchestration-pattern"),
    ("handoff", "orchestration-pattern"),
    ("evaluator", "orchestration-pattern"),
    ("fan-out", "fanout-pattern"),
    ("fan-in", "fanout-pattern"),
    ("parallel", "fanout-pattern"),
    ("validation", "quality-baseline"),
    ("baseline", "quality-baseline"),
    ("deep research", "open-source-deep-research"),
    ("observability", "llm-observability"),
    ("workflow builder", "visual-workflow-builder"),
    ("control plane", "cli-control-plane"),
    ("session", "session-viewer"),
    ("orchestrator", "agent-orchestrator"),
    ("markdown viewer", "local-markdown-viewer"),
    ("knowledge", "knowledge-base"),
]

_TIER_ONE_CATEGORIES = {
    "native-runtime",
    "runner-foundation",
    "supervisor-template",
}

_TIER_TWO_CATEGORIES = {
    "reference-runtime",
    "orchestration-pattern",
    "fanout-pattern",
    "quality-baseline",
}


def _strip_inline_md(text: str) -> str:
    """Remove backticks/asterisks around player names in headings."""
    return text.strip().strip("`").strip("*").strip()


def _strip_confidence_tags(text: str) -> str:
    """Remove inline [HIGH — N sources] tags from a block body."""
    return re.sub(r"\s*\[(?:HIGH|MEDIA|LOW)\s*[—–-]\s*[^\]]*\]", "", text).strip()


def _normalize_slug(text: str | None) -> str | None:
    if not text:
        return None
    value = text.strip().lower()
    value = re.sub(r"`|\*|\"", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or None


def _parse_tier(value: str | None) -> int | None:
    if not value:
        return None
    m = re.search(r"\b([123])\b|tier\s*([123])", value, re.IGNORECASE)
    if not m:
        return None
    raw = m.group(1) or m.group(2)
    try:
        return int(raw)
    except ValueError:
        return None


def _find_section_for_position(text: str, pos: int) -> str | None:
    """Return the nearest ## section heading preceding `pos`."""
    candidate = None
    for m in _SECTION_HEADING_RE.finditer(text):
        if m.start() > pos:
            break
        candidate = f"{m.group(1)}. {m.group(2).strip()}"
    return candidate


def _infer_tier(section: str | None, number: str) -> int | None:
    """Legacy tier inference from explicit Tier sections only.

    Older outputs sometimes used "## 1. ..." sections as priority tiers, but
    generic report sections like "## 2. Players e Prior Art" are not tiers.
    """
    if section:
        m = re.match(r"^(\d+)\.\s*(?:tier|t[íi]er|prioridade)", section, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                pass
    return None


def _infer_category(name: str, what_it_does: str, section: str | None, role: str | None = None, action: str | None = None, insight: str | None = None) -> str | None:
    haystack = f"{name} {what_it_does} {section or ''} {role or ''} {action or ''} {insight or ''}".lower()
    for token, slug in _CATEGORY_RULES:
        if token in haystack:
            return slug
    return None


def _infer_fit(category: str | None, insight: str | None) -> str | None:
    haystack = f"{category or ''} {insight or ''}".lower()
    if category in _TIER_ONE_CATEGORIES or any(token in haystack for token in ("peça nativa", "molde direto", "fundação operacional", "best fit", "alto fit")):
        return "high"
    if category in _TIER_TWO_CATEGORIES:
        return "medium"
    return None


def _infer_role(category: str | None) -> str | None:
    mapping = {
        "native-runtime": "delegation-runtime",
        "runner-foundation": "operational-envelope",
        "supervisor-template": "heartbeat-template",
        "reference-runtime": "prior-art",
        "orchestration-pattern": "pattern-source",
        "fanout-pattern": "parallelism-reference",
        "quality-baseline": "runner-quality-reference",
    }
    return mapping.get(category or "")


def _infer_action(category: str | None) -> str | None:
    mapping = {
        "native-runtime": "Usar como mecanismo de workers/explorers bounded sob controle do manager.",
        "runner-foundation": "Usar como envelope operacional para bootstrap, estado, logs, retry e guardrails.",
        "supervisor-template": "Usar como molde de heartbeat/tick para execução longa.",
        "reference-runtime": "Copiar o padrão de estado/eventos, não a API literal.",
        "orchestration-pattern": "Usar como vocabulário de desenho e padrões de orquestração.",
        "fanout-pattern": "Usar como referência para fan-out/fan-in quando houver tarefas paralelas.",
        "quality-baseline": "Usar como referência de qualidade operacional e validação.",
    }
    return mapping.get(category or "")


def _tier_from_category(category: str | None, fit: str | None) -> int | None:
    if fit == "high" or category in _TIER_ONE_CATEGORIES:
        return 1
    if fit == "medium" or category in _TIER_TWO_CATEGORIES:
        return 2
    if fit == "low":
        return 3
    return None


def _detect_exclusion(blocks: list[str]) -> tuple[bool, str | None]:
    combined = " ".join(blocks).lower()
    for token in _EXCLUSION_TOKENS:
        if token.lower() in combined:
            # Find a short reason hint
            for known in ("langchain", "out of scope", "fora do escopo", "user directive"):
                if known in combined:
                    return True, known
            return True, "explicit_exclusion"
    return False, None


def _read_text(path: Path) -> str | None:
    if not path.exists():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None


def _extract_from_text(text: str, file_label: str) -> list[dict[str, Any]]:
    """Walk all ### N.N headings and build one player record per heading."""
    players: list[dict[str, Any]] = []
    headings = list(_PLAYER_HEADING_RE.finditer(text))
    if not headings:
        return players

    for idx, match in enumerate(headings):
        number = match.group(1)
        name = _strip_inline_md(match.group(2))

        # Block body extends from end of this heading to start of next heading
        # (or end of text for the last one).
        body_start = match.end()
        body_end = headings[idx + 1].start() if idx + 1 < len(headings) else len(text)
        body = text[body_start:body_end]

        section = _find_section_for_position(text, match.start())

        fields: dict[str, Any] = {
            "id": None,  # assigned in caller after dedup
            "number": number,
            "name": name,
            "tier": None,
            "category": None,
            "role": None,
            "fit": None,
            "action": None,
            "what_it_does": None,
            "what_it_does_not": None,
            "insight": None,
            "source_title": None,
            "source_url": None,
            "source_date": None,
            "excluded": False,
            "exclusion_reason": None,
            "first_seen_in": file_label,
            "section": section,
        }

        for field_name, field_re in _FIELD_RES.items():
            m = field_re.search(body)
            if not m:
                continue
            value = _strip_confidence_tags(m.group(1).strip())

            if field_name == "source":
                # Parse the first citation we find. Multi-source blocks store
                # extra citations in `additional_sources`.
                citations = list(_SOURCE_CITATION_RE.finditer(value))
                if citations:
                    first = citations[0]
                    fields["source_title"] = first.group(1).strip()
                    fields["source_url"] = first.group(2).strip()
                    fields["source_date"] = first.group(3) if first.group(3) else "date_unknown"
                    if len(citations) > 1:
                        fields["additional_sources"] = [
                            {
                                "title": c.group(1).strip(),
                                "url": c.group(2).strip(),
                                "date": c.group(3) if c.group(3) else "date_unknown",
                            }
                            for c in citations[1:]
                        ]
            else:
                if field_name == "tier":
                    fields[field_name] = _parse_tier(value)
                elif field_name == "category":
                    fields[field_name] = _normalize_slug(value)
                elif field_name == "fit":
                    fields[field_name] = _normalize_slug(value)
                else:
                    fields[field_name] = value

        fields["category"] = fields.get("category") or _infer_category(
            name,
            fields.get("what_it_does") or "",
            section,
            fields.get("role"),
            fields.get("action"),
            fields.get("insight"),
        )
        fields["fit"] = fields.get("fit") or _infer_fit(fields.get("category"), fields.get("insight"))
        fields["role"] = fields.get("role") or _infer_role(fields.get("category"))
        fields["action"] = fields.get("action") or _infer_action(fields.get("category"))
        fields["tier"] = fields.get("tier") or _tier_from_category(fields.get("category"), fields.get("fit")) or _infer_tier(section, number)

        # Exclusion check across all narrative fields
        narrative_blocks = [
            fields.get("what_it_does") or "",
            fields.get("what_it_does_not") or "",
            fields.get("insight") or "",
        ]
        excluded, reason = _detect_exclusion(narrative_blocks)
        fields["excluded"] = excluded
        fields["exclusion_reason"] = reason

        players.append(fields)

    return players


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


def extract_players(folder: Path) -> dict[str, Any]:
    slug = folder.name
    all_players: list[dict[str, Any]] = []
    evidence_refs: list[str] = []

    report_text = _read_text(folder / "02-research-report.md")
    if report_text:
        all_players.extend(_extract_from_text(report_text, "02-research-report.md"))
        evidence_refs.append("02-research-report.md")

    followups = sorted(folder.glob("[0-9][0-9]-*.md"))
    canonical_files = {
        "00-query-original.md",
        "01-deep-research-prompt.md",
        "02-research-report.md",
        "03-recommendations.md",
    }
    for fu in followups:
        if fu.name in canonical_files:
            continue
        text = _read_text(fu)
        if text:
            all_players.extend(_extract_from_text(text, fu.name))
            evidence_refs.append(fu.name)

    # Dedup by name (case-insensitive). Earliest occurrence wins; later
    # occurrences only fill missing fields.
    seen: dict[str, dict[str, Any]] = {}
    for p in all_players:
        key = p["name"].lower()
        if key in seen:
            existing = seen[key]
            for field, value in p.items():
                if existing.get(field) in (None, "", False) and value not in (None, "", False):
                    existing[field] = value
            continue
        seen[key] = p

    # Stable order: by number (e.g. "1.1", "1.2", ..., "2.1", ...) when present;
    # otherwise alphabetical.
    def sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
        num = item.get("number") or ""
        parts = num.split(".")
        try:
            return (0, tuple(int(p) for p in parts), item["name"].lower())
        except ValueError:
            return (1, item["name"].lower())

    ordered = sorted(seen.values(), key=sort_key)

    # Assign canonical ids
    by_tier: dict[int, int] = {}
    by_category: dict[str, int] = {}
    excluded_count = 0
    for i, p in enumerate(ordered, start=1):
        p["id"] = f"player-{i:03d}"
        tier = p.get("tier")
        if isinstance(tier, int):
            by_tier[tier] = by_tier.get(tier, 0) + 1
        cat = p.get("category")
        if cat:
            by_category[cat] = by_category.get(cat, 0) + 1
        if p.get("excluded"):
            excluded_count += 1

    confidence = _derive_confidence(folder)

    return {
        "schema_version": "1.1",
        "generator": "tech-research/players_extractor.py",
        "research_slug": slug,
        "generated_at": datetime.now(tz=timezone.utc).strftime("%Y-%m-%d"),
        "derived_from_research": True,
        "evidence_refs": evidence_refs,
        "confidence": confidence,
        "limitations": [
            "qualitative comparison only — no weighted competitive score",
            "player extraction based on ### N.N heading pattern; players without this structure are not captured",
            "fit and role fields inferred from category heuristics when not explicitly declared in the report",
            "exclusion detection is keyword-based and may miss implicit exclusions",
        ],
        "tier_meaning": {
            1: "Peças primárias para construir a solução agora.",
            2: "Referências e padrões que informam a arquitetura, mas não são a peça central.",
            3: "Contexto secundário, monitorar ou adiar.",
        },
        "players": ordered,
        "totals": {
            "total": len(ordered),
            "by_tier": dict(sorted(by_tier.items())),
            "by_category": dict(sorted(by_category.items())),
            "excluded": excluded_count,
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
    parser = argparse.ArgumentParser(description="Extract players.yaml from a research or bench folder")
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
        sys.stderr.write(f"[players-extractor] mode={mode.value} (folder: {folder.name})\n")

    payload_obj = extract_players(folder)
    payload = _yaml_dump(payload_obj) + "\n"

    if args.stdout:
        sys.stdout.write(payload)
        return 0

    target = folder / "players.yaml"
    if args.check:
        if not target.exists():
            sys.stderr.write(f"check failed: {target} missing\n")
            return 1
        if target.read_text(encoding="utf-8") != payload:
            sys.stderr.write(f"check failed: {target} is stale\n")
            return 1
        if not args.quiet:
            t = payload_obj["totals"]
            print(f"[players-extractor] up-to-date: {t['total']} players ({t['excluded']} excluded)")
        return 0

    write_atomic(target, payload)
    if not args.quiet:
        t = payload_obj["totals"]
        tiers = ", ".join(f"T{k}={v}" for k, v in t["by_tier"].items()) or "—"
        print(f"[players-extractor] wrote {target}: {t['total']} players ({tiers}, {t['excluded']} excluded)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
