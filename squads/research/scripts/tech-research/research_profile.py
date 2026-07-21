#!/usr/bin/env python3
"""research_profile.py — derives the universal research profile contract.

The profile tells downstream generators and the dashboard which decision context
the dossier belongs to without creating separate pipelines for tech, bench,
market, product, and mapping research.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None  # type: ignore[assignment]


PROFILE_DEFINITIONS: dict[str, dict[str, Any]] = {
    "tech": {
        "label": "Tech",
        "intent": "Decisão técnica, arquitetura, runtime, integração ou implementação.",
        "decision_mode": "technical_adoption",
        "primary_question": "Qual abordagem técnica deve ser adotada e com quais riscos?",
        "dashboard_labels": {
            "players": "Alternativas técnicas",
            "matrices": "Trade-offs",
            "actions": "Plano de implementação",
            "rubric": "Rubrica técnica",
        },
        "rubric_dimensions": [
            "implementation_readiness",
            "integration_fit",
            "operational_risk",
            "maintainability",
            "evidence_strength",
            "strategic_leverage",
        ],
    },
    "bench": {
        "label": "Bench",
        "intent": "Comparação formal ou pré-formal entre players, ferramentas, produtos ou fornecedores.",
        "decision_mode": "comparative_selection",
        "primary_question": "Qual player vence para cada cenário e por quê?",
        "dashboard_labels": {
            "players": "Players comparados",
            "matrices": "Matriz competitiva",
            "actions": "Próximos testes",
            "rubric": "Rubrica comparativa",
        },
        "rubric_dimensions": [
            "feature_depth",
            "ux_quality",
            "pricing_tco",
            "integration_ecosystem",
            "support_reliability",
            "market_fit",
        ],
    },
    "market": {
        "label": "Mercado",
        "intent": "Mapa de mercado, categorias, concorrência, sinais de demanda, canais e oportunidade.",
        "decision_mode": "market_entry_or_positioning",
        "primary_question": "Onde está a oportunidade e quais sinais sustentam a entrada?",
        "dashboard_labels": {
            "players": "Players de mercado",
            "matrices": "Mapa de categorias",
            "actions": "Movimentos comerciais",
            "rubric": "Rubrica de mercado",
        },
        "rubric_dimensions": [
            "category_strength",
            "demand_signal",
            "differentiation",
            "channel_access",
            "timing",
            "risk_exposure",
        ],
    },
    "product": {
        "label": "Produto",
        "intent": "Descoberta, priorização, roadmap, posicionamento ou avaliação de proposta de produto.",
        "decision_mode": "product_prioritization",
        "primary_question": "Qual decisão de produto maximiza valor, aprendizado e tração?",
        "dashboard_labels": {
            "players": "Alternativas de produto",
            "matrices": "Mapa de valor",
            "actions": "Roadmap",
            "rubric": "Rubrica de produto",
        },
        "rubric_dimensions": [
            "user_value",
            "business_impact",
            "build_effort",
            "retention_leverage",
            "strategic_fit",
            "learning_value",
        ],
    },
    "mapping": {
        "label": "Mapeamento",
        "intent": "Mapeamento de processo, sistema, ecossistema, território ou operação antes da decisão.",
        "decision_mode": "territory_mapping",
        "primary_question": "Como o território funciona, onde estão os gargalos e o que investigar depois?",
        "dashboard_labels": {
            "players": "Atores e componentes",
            "matrices": "Mapa operacional",
            "actions": "Trilhas de aprofundamento",
            "rubric": "Rubrica de alavancas",
        },
        "rubric_dimensions": [
            "leverage",
            "bottleneck_severity",
            "automation_potential",
            "dependency_risk",
            "evidence_strength",
            "next_step_clarity",
        ],
    },
}

PROFILE_PATTERNS: list[tuple[str, list[str]]] = [
    ("bench", [r"\bbench(mark)?\b", r"\bcompar(a|ar|ativo|ison)\b", r"\bduelo\b", r"\bscorecard\b", r"\bplayers?\b"]),
    ("market", [r"\bmercado\b", r"\bmarket\b", r"\bconcorr", r"\bcompetitiv", r"\bdemanda\b", r"\bpricing\b", r"\bICP\b", r"\bcanal"]),
    ("product", [r"\bproduto\b", r"\bproduct\b", r"\broadmap\b", r"\bfeature\b", r"\busu[aá]rio\b", r"\bretention\b", r"\bpositioning\b"]),
    ("mapping", [r"\bmapeamento\b", r"\bmapping\b", r"\becossistema\b", r"\bprocesso\b", r"\bterrit[oó]rio\b", r"\btaxonomia\b"]),
    ("tech", [r"\btech\b", r"\bt[eé]cnic", r"\barquitet", r"\bruntime\b", r"\bc[oó]digo\b", r"\bintegra", r"\bframework\b", r"\brunner\b"]),
]


def today() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def clean_text(value: str, limit: int = 260) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    text = re.sub(r"[`*_>#]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def source_excerpt(folder: Path) -> tuple[str, list[str]]:
    candidates = [
        "00-query-original.md",
        "README.md",
        "02-research-report.md",
        "03-recommendations.md",
    ]
    chunks: list[str] = []
    used: list[str] = []
    for file_name in candidates:
        text = read_text(folder / file_name)
        if text:
            chunks.append(text[:4000])
            used.append(file_name)
    return "\n\n".join(chunks), used


def infer_profile(text: str) -> tuple[str, int, dict[str, int]]:
    scores: dict[str, int] = {}
    for profile_type, patterns in PROFILE_PATTERNS:
        score = 0
        for pattern in patterns:
            score += len(re.findall(pattern, text, flags=re.IGNORECASE))
        scores[profile_type] = score
    best = max(scores.items(), key=lambda item: item[1])
    if best[1] <= 0:
        return "tech", 0, scores
    return best[0], best[1], scores


def confidence_from_score(score: int) -> str:
    if score >= 8:
        return "high"
    if score >= 3:
        return "medium"
    return "low"


def build_profile(folder: Path) -> dict[str, Any]:
    text, source_files = source_excerpt(folder)
    profile_type, score, scores = infer_profile(text)
    definition = PROFILE_DEFINITIONS[profile_type]

    return {
        "schema_version": "aiox-research-profile-v1",
        "research_slug": folder.name,
        "generated_at": today(),
        "derived_from_research": True,
        "profile": {
            "type": profile_type,
            "label": definition["label"],
            "intent": definition["intent"],
            "decision_mode": definition["decision_mode"],
            "primary_question": definition["primary_question"],
            "confidence": confidence_from_score(score),
        },
        "supported_profiles": [
            {
                "type": key,
                "label": value["label"],
                "decision_mode": value["decision_mode"],
            }
            for key, value in PROFILE_DEFINITIONS.items()
        ],
        "dashboard_labels": definition["dashboard_labels"],
        "artifact_policy": {
            "common_required": [
                "README.md",
                "02-research-report.md",
                "03-recommendations.md",
                "metrics.yaml",
                "pipeline-state.yaml",
                "execution-log.jsonl",
                "sources.yaml",
                "research-graph.json",
                "action-plan.yaml",
                "claims.yaml",
                "risk-register.yaml",
                "decision-ledger.yaml",
                "dashboard-manifest.yaml",
                "validation-report.yaml",
            ],
            "comparison_required_when_alternatives_exist": [
                "players.yaml",
                "matrices.yaml",
                "decision-rubric.yaml",
            ],
            "profile_specific_optional": {
                "tech": ["architecture-blueprint.md", "implementation-plan.md"],
                "bench": ["bench-output-dash.json", "battle-card.md", "scorecard.md"],
                "market": ["market-map.yaml", "opportunities.yaml", "category-map.yaml"],
                "product": ["feature-map.yaml", "roadmap.yaml", "positioning.md"],
                "mapping": ["process-map.yaml", "actors.yaml", "bottlenecks.yaml"],
            }[profile_type],
        },
        "rubric_profile": {
            "dimension_pack": profile_type,
            "dimensions": definition["rubric_dimensions"],
            "default_preset": profile_type,
        },
        "inference": {
            "method": "deterministic_keyword_score",
            "source_files": source_files,
            "scores": scores,
            "winning_score": score,
        },
        "limitations": [
            "Perfil inferido deterministicamente a partir do dossier; pode ser sobrescrito por um profile explícito em execução futura.",
            "Este artefato seleciona linguagem e contrato de consumo; não muda fatos, fontes ou conclusões da pesquisa.",
        ],
    }


class NoAliasDumper(yaml.SafeDumper if yaml else object):
    def ignore_aliases(self, data: Any) -> bool:
        return True


def dump_yaml(value: Any) -> str:
    if yaml is None:
        raise RuntimeError("PyYAML is required")
    return yaml.dump(value, Dumper=NoAliasDumper, allow_unicode=True, sort_keys=False, width=120)


def write_atomic(path: Path, payload: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate research-profile.yaml")
    parser.add_argument("folder")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--stdout", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        sys.stderr.write(f"error: folder not found: {folder}\n")
        return 2

    payload = dump_yaml(build_profile(folder))
    target = folder / "research-profile.yaml"

    if args.stdout:
        sys.stdout.write(payload)
        return 0

    stale = not target.exists() or target.read_text(encoding="utf-8") != payload
    if args.check:
        if stale and not args.quiet:
            sys.stderr.write("stale dashboard artifact: research-profile.yaml\n")
        return 1 if stale else 0

    if stale:
        write_atomic(target, payload)
    if not args.quiet:
        print("generated research-profile.yaml")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
