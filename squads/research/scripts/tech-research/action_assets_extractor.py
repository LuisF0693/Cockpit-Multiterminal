#!/usr/bin/env python3
"""action_assets_extractor.py — derives Gold action artifacts from a research folder.

Generates the four EPIC-150 action assets without a network call or LLM:

- action-plan.yaml
- claims.yaml
- risk-register.yaml
- decision-ledger.yaml

The extractor is intentionally conservative. It only uses text already present
in the research dossier and keeps markdown fallbacks useful when structure is
weak.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover - repo env has PyYAML, but fail clearly.
    yaml = None  # type: ignore[assignment]


ACTION_PLAN = "action-plan.yaml"
CLAIMS = "claims.yaml"
RISK_REGISTER = "risk-register.yaml"
DECISION_LEDGER = "decision-ledger.yaml"


@dataclass(frozen=True)
class MarkdownSection:
    level: int
    title: str
    body: str
    file: str


def read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def clean_text(value: str, limit: int = 240) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    text = re.sub(r"[`*_>#]+", "", text)
    text = re.sub(r"^\s*[-+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def slugify(value: str) -> str:
    text = value.lower()
    text = re.sub(r"`|\*|\"", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-") or "item"


def split_sections(text: str, file_label: str) -> list[MarkdownSection]:
    matches = list(re.finditer(r"^(#{2,3})\s+(.+?)\s*$", text, flags=re.MULTILINE))
    sections: list[MarkdownSection] = []
    for idx, match in enumerate(matches):
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        sections.append(
            MarkdownSection(
                level=len(match.group(1)),
                title=clean_text(match.group(2), 140),
                body=text[start:end].strip(),
                file=file_label,
            )
        )
    return sections


def find_section(sections: list[MarkdownSection], patterns: list[str]) -> MarkdownSection | None:
    regexes = [re.compile(pattern, re.IGNORECASE) for pattern in patterns]
    for section in sections:
        haystack = f"{section.title}\n{section.body}"
        if any(regex.search(haystack) for regex in regexes):
            return section
    return None


def markdown_list_items(text: str, limit: int = 8) -> list[str]:
    items = []
    for line in text.splitlines():
        stripped = line.strip()
        if re.match(r"^[-*]\s+", stripped) or re.match(r"^\d+\.\s+", stripped):
            item = clean_text(re.sub(r"^[-*]\s+|^\d+\.\s+", "", stripped), 220)
            if item:
                items.append(item)
    if items:
        return items[:limit]
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])", clean_text(text, 1200))
    return [item for item in sentences if len(item) >= 30][:limit]


def markdown_tables(text: str) -> list[dict[str, Any]]:
    tables: list[dict[str, Any]] = []
    lines = text.splitlines()
    idx = 0
    while idx < len(lines) - 1:
        header = lines[idx].strip()
        sep = lines[idx + 1].strip()
        if not (header.startswith("|") and header.endswith("|") and re.match(r"^\|[\s:-]+\|[\s:|-]*$", sep)):
            idx += 1
            continue
        columns = [cell.strip() for cell in header.strip("|").split("|")]
        rows: list[dict[str, str]] = []
        idx += 2
        while idx < len(lines) and lines[idx].strip().startswith("|") and lines[idx].strip().endswith("|"):
            cells = [clean_text(cell.strip(), 180) for cell in lines[idx].strip().strip("|").split("|")]
            rows.append({column: cells[col_idx] if col_idx < len(cells) else "" for col_idx, column in enumerate(columns)})
            idx += 1
        if rows:
            tables.append({"columns": columns, "rows": rows})
    return tables


def first_sentence(text: str, fallback: str) -> str:
    cleaned = clean_text(text, 420)
    match = re.match(r"^(.{30,}?[.!?])\s+", cleaned)
    return match.group(1) if match else cleaned or fallback


def priority_for(index: int, text: str) -> str:
    haystack = text.lower()
    if any(token in haystack for token in ("p0", "crítico", "critico", "obrigatório", "bloqueia", "agora")):
        return "P0"
    if any(token in haystack for token in ("p1", "high", "alto", "primeiro", "próximo", "proximo")):
        return "P1"
    return "P1" if index < 3 else "P2"


def effort_for(text: str) -> str:
    haystack = text.lower()
    if any(token in haystack for token in ("adr", "document", "checklist", "contrato")):
        return "S"
    if any(token in haystack for token in ("implementar", "criar", "normalizar", "integrar", "prototipar")):
        return "M"
    return "M"


def build_action_plan(folder: Path, sections: list[MarkdownSection]) -> dict[str, Any]:
    recommendation = find_section(sections, ["decis", "veredito", "recommend"])
    next_steps = find_section(sections, ["pr[oó]ximos passos", "next steps", "implementation", "roadmap"])
    roadmap_section = find_section(sections, ["roadmap", "implementation"])

    decision_summary = first_sentence(recommendation.body if recommendation else "", "Converter recomendações em plano de ação estruturado.")
    decision_title = clean_text(recommendation.title if recommendation else "Decisão recomendada", 120)
    if decision_title.lower() in {"decisão", "decisão recomendada", "veredito", "recommendations"}:
        decision_title = decision_summary

    raw_actions = markdown_list_items(next_steps.body if next_steps else "", 8)
    if not raw_actions and recommendation:
        raw_actions = markdown_list_items(recommendation.body, 5)
    if not raw_actions:
        raw_actions = ["Revisar recomendações e transformar o próximo passo em story com owner e evidência."]

    actions = []
    for index, item in enumerate(raw_actions, start=1):
        actions.append(
            {
                "id": f"AP-{index}",
                "title": clean_text(item, 120),
                "owner_hint": "research-owner",
                "priority": priority_for(index - 1, item),
                "effort": effort_for(item),
                "status": "proposed",
                "rationale": clean_text(item, 220),
                "evidence": f"{next_steps.file if next_steps else recommendation.file if recommendation else '03-recommendations.md'}",
            }
        )

    roadmap_rows: list[dict[str, Any]] = []
    for table in markdown_tables(roadmap_section.body if roadmap_section else ""):
        for idx, row in enumerate(table["rows"][:8], start=1):
            values = [value for value in row.values() if value]
            if not values:
                continue
            roadmap_rows.append(
                {
                    "phase": clean_text(values[0], 80) or f"Fase {idx}",
                    "title": clean_text(values[1] if len(values) > 1 else values[0], 120),
                    "priority": priority_for(idx - 1, " ".join(values)),
                    "effort": effort_for(" ".join(values)),
                    "status": "proposed",
                }
            )
    if not roadmap_rows:
        roadmap_rows = [
            {
                "phase": f"Fase {idx}",
                "title": action["title"],
                "priority": action["priority"],
                "effort": action["effort"],
                "status": action["status"],
            }
            for idx, action in enumerate(actions[:6], start=1)
        ]

    return {
        "schema_version": "aiox-research-action-plan-v1",
        "research_slug": folder.name,
        "generated_at": today(),
        "derived_from_research": True,
        "decision": {
            "id": "DEC-001",
            "title": decision_title,
            "recommendation": "build" if re.search(r"constru|implementar|build|criar", decision_summary, re.IGNORECASE) else "decide",
            "summary": decision_summary,
            "confidence": "medium",
            "evidence": [recommendation.file if recommendation else "03-recommendations.md"],
        },
        "actions": actions,
        "roadmap": roadmap_rows,
    }


def build_claims(folder: Path, sections: list[MarkdownSection]) -> dict[str, Any]:
    candidates: list[tuple[str, str]] = []
    for section in sections:
        if section.level != 2:
            continue
        body = clean_text(section.body, 1600)
        sentences = re.split(r"(?<=[.!?])\s+", body)
        for sentence in sentences:
            if len(sentence) < 45:
                continue
            if re.search(r"\b(deve|precisa|permite|resolve|evita|melhora|não pode|nao pode|must|should|supports|requires)\b", sentence, re.IGNORECASE):
                candidates.append((clean_text(sentence, 220), section.file))
    dedup: list[tuple[str, str]] = []
    seen: set[str] = set()
    for claim, source in candidates:
        key = slugify(claim)[:80]
        if key in seen:
            continue
        seen.add(key)
        dedup.append((claim, source))
        if len(dedup) >= 8:
            break

    return {
        "schema_version": "aiox-research-claims-v1",
        "research_slug": folder.name,
        "generated_at": today(),
        "derived_from_research": True,
        "claims": [
            {
                "id": f"CL-{idx:03d}",
                "claim": claim,
                "confidence": "medium",
                "evidence": [source],
                "status": "derived",
                "implication": "Usar como premissa verificável antes de executar a próxima ação.",
            }
            for idx, (claim, source) in enumerate(dedup, start=1)
        ],
        "open_evidence_gaps": [],
    }


def build_risks(folder: Path, sections: list[MarkdownSection]) -> dict[str, Any]:
    risk_section = find_section(sections, ["risk", "risco", "anti-pattern", "não fazer", "nao fazer", "limita"])
    items = markdown_list_items(risk_section.body if risk_section else "", 8)
    if not items and risk_section:
        for table in markdown_tables(risk_section.body):
            for row in table["rows"][:8]:
                values = [value for value in row.values() if value]
                if values:
                    items.append(" — ".join(values[:3]))
    if not items:
        items = ["Executar a recomendação sem owner, evidência ou critério de parada explícito."]

    return {
        "schema_version": "aiox-research-risk-register-v1",
        "research_slug": folder.name,
        "generated_at": today(),
        "derived_from_research": True,
        "risks": [
            {
                "id": f"R-{idx:03d}",
                "risk": clean_text(item, 160),
                "severity": "high" if idx == 1 else "medium",
                "probability": "medium",
                "mitigation": "Converter em acceptance criteria, owner e evidência antes de executar.",
                "owner_hint": "research-owner",
                "evidence": [risk_section.file if risk_section else "03-recommendations.md"],
            }
            for idx, item in enumerate(items[:8], start=1)
        ],
    }


def build_decision_ledger(folder: Path, action_plan: dict[str, Any], sections: list[MarkdownSection]) -> dict[str, Any]:
    anti = find_section(sections, ["anti-pattern", "não fazer", "nao fazer", "alternativa", "trade-off"])
    rejected = markdown_list_items(anti.body if anti else "", 5)
    decision = action_plan["decision"]
    return {
        "schema_version": "aiox-research-decision-ledger-v1",
        "research_slug": folder.name,
        "generated_at": today(),
        "derived_from_research": True,
        "decisions": [
            {
                "id": "DEC-001",
                "decision": decision["title"],
                "status": "selected",
                "confidence": decision["confidence"],
                "alternatives_rejected": [slugify(item) for item in rejected[:5]],
                "evidence": decision["evidence"],
                "consequence": decision["summary"],
            }
        ],
    }


def collect_sections(folder: Path) -> list[MarkdownSection]:
    files = [
        "02-research-report.md",
        "03-recommendations.md",
        "quick-wins.md",
    ]
    files.extend(path.name for path in sorted(folder.glob("[0-9][0-9]-*.md")) if path.name not in files)
    sections: list[MarkdownSection] = []
    for file_name in files:
        text = read_text(folder / file_name)
        if text:
            sections.extend(split_sections(text, file_name))
    return sections


def today() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def yaml_dump(value: Any) -> str:
    if yaml is None:
        raise RuntimeError("PyYAML is required")
    return yaml.safe_dump(value, allow_unicode=True, sort_keys=False, width=120)


def write_atomic(path: Path, payload: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, path)


def build_assets(folder: Path) -> dict[str, dict[str, Any]]:
    sections = collect_sections(folder)
    action_plan = build_action_plan(folder, sections)
    return {
        ACTION_PLAN: action_plan,
        CLAIMS: build_claims(folder, sections),
        RISK_REGISTER: build_risks(folder, sections),
        DECISION_LEDGER: build_decision_ledger(folder, action_plan, sections),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Gold action assets for a tech-research or bench folder")
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
        sys.stderr.write(f"[action-assets-extractor] mode={mode.value} (folder: {folder.name})\n")

    assets = build_assets(folder)
    payloads = {name: yaml_dump(asset) for name, asset in assets.items()}

    if args.stdout:
        for name, payload in payloads.items():
            sys.stdout.write(f"--- # {name}\n{payload}")
        return 0

    stale = []
    for name, payload in payloads.items():
        target = folder / name
        if target.exists() and target.read_text(encoding="utf-8") == payload:
            continue
        stale.append(name)
        if not args.check:
            write_atomic(target, payload)

    if args.check:
        if stale:
            if not args.quiet:
                sys.stderr.write("stale action assets: " + ", ".join(stale) + "\n")
            return 1
        return 0

    if not args.quiet:
        print("generated action assets: " + ", ".join(payloads))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
