#!/usr/bin/env python3
"""gold_profile_fixtures.py — emits minimal Gold fixtures for profile coverage.

The EPIC-150 universal contract must prove that tech-research can render more
than technical dossiers. This script creates deterministic fixture runs for the
non-tech profiles and then reuses the canonical generators for rubric,
manifest, and validation artifacts.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[4]
RESEARCH_ROOT = ROOT / "docs" / "research"
SCRIPT_DIR = Path(__file__).resolve().parent
TODAY = "2026-05-18"


PROFILES: dict[str, dict[str, Any]] = {
    "bench": {
        "slug": "2026-05-18-gold-bench-profile-fixture",
        "title": "Gold Bench Profile Fixture",
        "topic": "Bench comparativo de ferramentas de vídeo curto",
        "type": "bench",
        "label": "Bench",
        "intent": "Comparação formal entre players, ferramentas, produtos ou fornecedores.",
        "decision_mode": "comparative_selection",
        "question": "Qual player vence para cada cenário e por quê?",
        "labels": {
            "players": "Players comparados",
            "matrices": "Matriz competitiva",
            "actions": "Próximos testes",
            "rubric": "Rubrica comparativa",
        },
        "dimensions": ["feature_depth", "ux_quality", "pricing_tco", "integration_ecosystem", "support_reliability", "market_fit"],
        "player_names": ["Submagic", "Eddie", "Descript", "OpusClip", "Captions", "VEED", "CapCut"],
        "categories": ["short-form-editor", "pro-editor", "suite", "repurposing", "captioning", "browser-editor", "creator-tool"],
        "decision": "Rodar teste controlado com Submagic e Eddie antes de recomendar stack principal.",
    },
    "market": {
        "slug": "2026-05-18-gold-market-profile-fixture",
        "title": "Gold Market Profile Fixture",
        "topic": "Mapa de mercado para automação de atendimento B2B",
        "type": "market",
        "label": "Mercado",
        "intent": "Mapa de mercado, categorias, concorrência, sinais de demanda, canais e oportunidade.",
        "decision_mode": "market_entry_or_positioning",
        "question": "Onde está a oportunidade e quais sinais sustentam a entrada?",
        "labels": {
            "players": "Players de mercado",
            "matrices": "Mapa de categorias",
            "actions": "Movimentos comerciais",
            "rubric": "Rubrica de mercado",
        },
        "dimensions": ["category_strength", "demand_signal", "differentiation", "channel_access", "timing", "risk_exposure"],
        "player_names": ["Intercom", "Zendesk AI", "Gorgias", "Ada", "Tidio", "Freshdesk", "Drift"],
        "categories": ["enterprise-suite", "support-platform", "commerce-support", "automation-platform", "smb-chat", "helpdesk", "revenue-chat"],
        "decision": "Entrar pelo recorte mid-market com integração WhatsApp e prova de ROI em até 30 dias.",
    },
    "product": {
        "slug": "2026-05-18-gold-product-profile-fixture",
        "title": "Gold Product Profile Fixture",
        "topic": "Priorização de produto para Rubrica dinâmica no dashboard",
        "type": "product",
        "label": "Produto",
        "intent": "Descoberta, priorização, roadmap, posicionamento ou avaliação de proposta de produto.",
        "decision_mode": "product_prioritization",
        "question": "Qual decisão de produto maximiza valor, aprendizado e tração?",
        "labels": {
            "players": "Alternativas de produto",
            "matrices": "Mapa de valor",
            "actions": "Roadmap",
            "rubric": "Rubrica de produto",
        },
        "dimensions": ["user_value", "business_impact", "build_effort", "retention_leverage", "strategic_fit", "learning_value"],
        "player_names": ["Rubrica interativa", "Preset por persona", "Evidência por célula", "Export markdown", "URL compartilhável", "Histórico de pesos", "Modo comparação"],
        "categories": ["decision-ui", "persona", "traceability", "export", "sharing", "state", "comparison"],
        "decision": "Priorizar Rubrica interativa com presets por persona antes de expandir export e histórico.",
    },
    "mapping": {
        "slug": "2026-05-18-gold-mapping-profile-fixture",
        "title": "Gold Mapping Profile Fixture",
        "topic": "Mapeamento operacional do pipeline research-to-dashboard",
        "type": "mapping",
        "label": "Mapeamento",
        "intent": "Mapeamento de processo, sistema, ecossistema, território ou operação antes da decisão.",
        "decision_mode": "territory_mapping",
        "question": "Como o território funciona, onde estão os gargalos e o que investigar depois?",
        "labels": {
            "players": "Atores e componentes",
            "matrices": "Mapa operacional",
            "actions": "Trilhas de aprofundamento",
            "rubric": "Rubrica de alavancas",
        },
        "dimensions": ["leverage", "bottleneck_severity", "automation_potential", "dependency_risk", "evidence_strength", "next_step_clarity"],
        "player_names": ["Skill tech-research", "Extratores YAML", "Manifest validator", "ReaderBody", "Players view", "Action view", "Research index"],
        "categories": ["skill", "extractor", "validator", "dashboard", "view", "view", "indexer"],
        "decision": "Mapear dependências entre geradores e views antes de criar automações adicionais.",
    },
}

SUPPORTED_PROFILES = [
    {"type": "tech", "label": "Tech", "decision_mode": "technical_adoption"},
    {"type": "bench", "label": "Bench", "decision_mode": "comparative_selection"},
    {"type": "market", "label": "Mercado", "decision_mode": "market_entry_or_positioning"},
    {"type": "product", "label": "Produto", "decision_mode": "product_prioritization"},
    {"type": "mapping", "label": "Mapeamento", "decision_mode": "territory_mapping"},
]


def now() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def dump_yaml(value: Any) -> str:
    return yaml.safe_dump(value, allow_unicode=True, sort_keys=False, width=120)


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def source_rows(profile: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "id": f"src-{idx:03d}",
            "url": f"https://example.com/{profile['type']}/source-{idx}",
            "title": f"{profile['label']} source {idx}",
            "date": "2026",
            "credibility": "HIGH" if idx <= 9 else "MEDIUM",
            "multiplier": 1.3 if idx <= 9 else 1.0,
            "flags": [],
            "first_seen_in": "02-research-report.md",
            "first_seen_section": "1. Evidências",
            "kind": "fixture",
        }
        for idx in range(1, 14)
    ]


def players(profile: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for idx, name in enumerate(profile["player_names"], start=1):
        tier = 1 if idx in {1, 2, 3} else 2 if idx in {4, 5} else 3
        fit = "high" if tier == 1 else "medium" if tier == 2 else "low"
        rows.append(
            {
                "id": f"player-{idx:03d}",
                "number": f"2.{idx}",
                "name": name,
                "tier": tier,
                "category": profile["categories"][idx - 1],
                "role": "decision-candidate",
                "fit": fit,
                "action": f"Avaliar {name} contra a Rubrica {profile['label'].lower()} e decidir próximo passo.",
                "what_it_does": f"Representa um item relevante no domínio {profile['label']}.",
                "what_it_does_not": "Não é decisão automática; precisa de leitura da evidência e do contexto.",
                "insight": f"{name} ajuda a testar o contrato universal de {profile['label']}.",
                "source_title": f"{profile['label']} source {min(idx, 13)}",
                "source_url": f"https://example.com/{profile['type']}/source-{min(idx, 13)}",
                "source_date": "2026",
                "excluded": False,
                "exclusion_reason": None,
                "first_seen_in": "02-research-report.md",
                "section": "2. Players e Alternativas",
            }
        )
    return rows


def graph(profile: dict[str, Any], folder: Path) -> dict[str, Any]:
    nodes = [{"id": "root", "type": "root", "label": profile["title"], "path": "."}]
    edges = []
    for name in sorted(path.name for path in folder.iterdir() if path.is_file()):
        node_id = name.replace(".", "-").replace("_", "-")
        nodes.append({"id": node_id, "type": "artifact", "label": name, "file": name})
        edges.append({"from": "root", "to": node_id, "relation": "contains"})
    for source in source_rows(profile):
        nodes.append({"id": source["id"], "type": "source", "label": source["title"], "url": source["url"]})
        edges.append({"from": "02-research-report-md", "to": source["id"], "relation": "cites"})
    for player in players(profile):
        nodes.append({"id": player["id"], "type": "player", "label": player["name"], "category": player["category"]})
        edges.append({"from": "players-yaml", "to": player["id"], "relation": "lists"})
        edges.append({"from": player["id"], "to": "decision-rubric-yaml", "relation": "scored_by"})
    for idx in range(1, 6):
        claim_id = f"claim-{idx:03d}"
        action_id = f"action-{idx:03d}"
        nodes.append({"id": claim_id, "type": "claim", "label": f"Claim {idx}"})
        nodes.append({"id": action_id, "type": "action", "label": f"Action {idx}"})
        edges.extend(
            [
                {"from": "claims-yaml", "to": claim_id, "relation": "contains"},
                {"from": claim_id, "to": f"src-{idx:03d}", "relation": "supported_by"},
                {"from": action_id, "to": claim_id, "relation": "derived_from"},
                {"from": "action-plan-yaml", "to": action_id, "relation": "contains"},
            ]
        )
    for idx in range(1, 20):
        edges.append({"from": f"src-{((idx - 1) % 13) + 1:03d}", "to": f"player-{((idx - 1) % 7) + 1:03d}", "relation": "informs"})
    return {
        "schema_version": "aiox-research-graph-v1",
        "research_slug": folder.name,
        "generated_at": now(),
        "derived_from_research": True,
        "nodes": nodes,
        "edges": edges,
    }


def write_profile(folder: Path, profile: dict[str, Any]) -> None:
    payload = {
        "schema_version": "aiox-research-profile-v1",
        "research_slug": folder.name,
        "generated_at": now(),
        "derived_from_research": True,
        "profile": {
            "type": profile["type"],
            "label": profile["label"],
            "intent": profile["intent"],
            "decision_mode": profile["decision_mode"],
            "primary_question": profile["question"],
            "confidence": "high",
        },
        "supported_profiles": SUPPORTED_PROFILES,
        "dashboard_labels": profile["labels"],
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
            "comparison_required_when_alternatives_exist": ["players.yaml", "matrices.yaml", "decision-rubric.yaml"],
            "profile_specific_optional": [],
        },
        "rubric_profile": {
            "dimension_pack": profile["type"],
            "dimensions": profile["dimensions"],
            "default_preset": profile["type"],
        },
        "inference": {
            "method": "fixture_explicit_profile",
            "source_files": ["00-query-original.md", "README.md", "02-research-report.md", "03-recommendations.md"],
            "scores": {profile["type"]: 99},
            "winning_score": 99,
        },
        "limitations": ["Fixture sintética de contrato; valida estrutura, consumo visual e adaptação por domínio."],
    }
    write(folder / "research-profile.yaml", dump_yaml(payload))


def markdown_files(folder: Path, profile: dict[str, Any]) -> None:
    source_refs = "\n".join(
        f"- [{source['title']}]({source['url']}) — {source['date']}"
        for source in source_rows(profile)
    )
    write(
        folder / "README.md",
        f"""# {profile['title']}

> **Tópico:** {profile['topic']}

## TL;DR

Fixture Gold para validar o profile `{profile['type']}` no Research Observatory.

## Research Metadata

- workflow_version: tech-research-v3
- runtime_contract: filesystem-first
- coverage_score: 96
- citation_verified: true
- stop_reason: saturation_after_fixture_generation
- rubrics: information_recall, analysis, presentation
""",
    )
    write(folder / "00-query-original.md", f"# Query Original\n\n{profile['question']}\n")
    write(folder / "01-deep-research-prompt.md", f"# Prompt\n\nInvestigar {profile['topic']} com waves, fontes, players, matriz e ação.\n")
    write(
        folder / "02-research-report.md",
        f"""# 02 Research Report — {profile['label']}

## Scope

scope_declaration: fixture Gold para validar comparação, landscape, players, ferramentas e frameworks do profile `{profile['type']}`.

## 1. Evidências

[HIGH — evidência] A pesquisa usa fontes datadas e verificáveis para sustentar a decisão do domínio {profile['label']}. {source_refs}

## 2. Players e Alternativas

[HIGH — análise] A lista contém sete alternativas incluídas para permitir ranking, tiers e Rubrica ponderada.

## 3. Matriz de Decisão

[MEDIA — síntese] A matriz cruza sinais de valor, risco, evidência e prontidão sem substituir julgamento humano.

## Stop Reason

stop_reason: saturation_after_fixture_generation
""",
    )
    write(
        folder / "03-recommendations.md",
        f"""# 03 Recommendations — {profile['label']}

## Decisão Recomendada

{profile['decision']}

## Próximos Passos

- Validar top 3 alternativas com evidências do relatório.
- Converter o vencedor provisório em experimento pequeno.
- Registrar trade-offs no decision ledger antes de escalar.
""",
    )
    write(
        folder / "quick-wins.md",
        """# Quick Wins

## Quick Wins Selecionados

| ID | Ação | Impacto | Evidência |
|---|---|---|---|
| QW-1 | Revisar top 3 da Rubrica | Alto | 02-research-report.md §2 |
| QW-2 | Validar fontes críticas | Alto | 02-research-report.md §1 |
| QW-3 | Transformar decisão em story | Médio | 02-research-report.md §3 |
""",
    )
    write(folder / "evolving_report.md", f"# Evolving Report\n\nEstado consolidado da fixture {profile['label']}.\n")
    for idx in range(1, 7):
        write(folder / f"wave-{idx}-summary.md", f"# Wave {idx}\n\nWave {idx} consolidou sinais para {profile['label']}.\n")


def yaml_artifacts(folder: Path, profile: dict[str, Any]) -> None:
    srcs = source_rows(profile)
    player_rows = players(profile)
    write(folder / "sources.yaml", dump_yaml({"schema_version": 1.0, "research_slug": folder.name, "generated_at": TODAY, "sources": srcs}))
    write(
        folder / "players.yaml",
        dump_yaml(
            {
                "schema_version": 1.1,
                "research_slug": folder.name,
                "generated_at": TODAY,
                "derived_from_research": True,
                "tier_meaning": {
                    1: "Prioridade primária para decisão agora.",
                    2: "Referência útil para comparação ou desenho.",
                    3: "Contexto secundário para monitorar.",
                },
                "players": player_rows,
                "totals": {"total": len(player_rows), "excluded": 0},
            }
        ),
    )
    write(
        folder / "metrics.yaml",
        dump_yaml(
            {
                "workflow_version": "tech-research-v3",
                "coverage_score": 96,
                "integrity_score": 94,
                "citation_verified": True,
                "stop_reason": "saturation_after_fixture_generation",
                "runtime_contract": "filesystem-first",
                "status": "complete",
                "date": TODAY,
                "sources": {"total": len(srcs)},
                "waves": [f"wave-{idx}" for idx in range(1, 7)],
                "coverage_breakdown": {
                    "official_docs": 0.92,
                    "profile_contract": 0.98,
                    "rubric": 0.96,
                    "traceability": 0.95,
                },
                "rubrics": {
                    "information_recall": {"passed": 10, "total": 10},
                    "analysis": {"passed": 10, "total": 10},
                    "presentation": {"passed": 10, "total": 10},
                },
            }
        ),
    )
    write(
        folder / "pipeline-state.yaml",
        dump_yaml(
            {
                "pipeline_id": f"fixture-{profile['type']}",
                "status": "complete",
                "stop_reason": "saturation_after_fixture_generation",
                "phases": [{"id": f"M{idx}", "label": f"Phase {idx}", "status": "done"} for idx in range(1, 7)],
            }
        ),
    )
    write(
        folder / "curiosity_queue.yaml",
        dump_yaml(
            {
                "schema_version": "aiox-curiosity-v1",
                "items": [{"id": f"Q{idx}", "question": f"O que pode mudar a decisão {idx}?", "priority": "HIGH" if idx <= 2 else "MEDIUM"} for idx in range(1, 5)],
                "questions": [{"id": f"Q{idx}", "question": f"O que pode mudar a decisão {idx}?", "priority": "HIGH" if idx <= 2 else "MEDIUM", "next_action": "Validar com evidência."} for idx in range(1, 5)],
            }
        ),
    )
    write(
        folder / "action-plan.yaml",
        dump_yaml(
            {
                "schema_version": "aiox-research-action-plan-v1",
                "research_slug": folder.name,
                "generated_at": now(),
                "derived_from_research": True,
                "decision": {"id": "DEC-001", "title": profile["decision"], "summary": profile["decision"], "recommendation": "build"},
                "actions": [{"id": f"AP-{idx}", "title": f"Ação {idx} para {profile['label']}", "priority": "P1", "owner_hint": "research-owner", "status": "proposed", "rationale": "Derivado da fixture Gold."} for idx in range(1, 6)],
                "roadmap": [{"phase": f"Fase {idx}", "title": f"Marco {idx}", "priority": "P1", "effort": "M", "status": "proposed"} for idx in range(1, 6)],
            }
        ),
    )
    write(
        folder / "claims.yaml",
        dump_yaml(
            {
                "schema_version": "aiox-research-claims-v1",
                "research_slug": folder.name,
                "generated_at": now(),
                "derived_from_research": True,
                "claims": [{"id": f"CL-{idx}", "claim": f"Claim {idx} sustenta {profile['label']}.", "confidence": "high", "status": "verified", "evidence_refs": [f"sources.yaml src-{idx:03d}"]} for idx in range(1, 6)],
            }
        ),
    )
    write(
        folder / "risk-register.yaml",
        dump_yaml(
            {
                "schema_version": "aiox-research-risk-register-v1",
                "research_slug": folder.name,
                "generated_at": now(),
                "derived_from_research": True,
                "risks": [{"id": f"R-{idx}", "risk": f"Risco {idx}", "severity": "medium", "mitigation": "Validar antes de escalar.", "trigger": "Evidência divergente."} for idx in range(1, 5)],
            }
        ),
    )
    write(
        folder / "decision-ledger.yaml",
        dump_yaml(
            {
                "schema_version": "aiox-research-decision-ledger-v1",
                "research_slug": folder.name,
                "generated_at": now(),
                "derived_from_research": True,
                "decisions": [{"id": "DEC-001", "decision": profile["decision"], "status": "proposed", "rationale": "Fixture Gold valida contrato universal."}],
            }
        ),
    )
    write(
        folder / "matrices.yaml",
        dump_yaml(
            {
                "schema_version": "aiox-research-matrices-v1",
                "research_slug": folder.name,
                "generated_at": now(),
                "derived_from_research": True,
                "matrices": [{"id": f"M-{idx}", "title": f"{profile['label']} matrix {idx}", "summary": "Matriz sintética de validação Gold."} for idx in range(1, 4)],
            }
        ),
    )
    write(
        folder / "ux-patterns.yaml",
        dump_yaml(
            {
                "schema_version": "aiox-ux-patterns-v1",
                "patterns": [{"id": f"P-{idx}", "name": f"Padrão {idx}", "description": f"Padrão útil para {profile['label']}."} for idx in range(1, 4)],
            }
        ),
    )


def logs(folder: Path, profile: dict[str, Any]) -> None:
    rows = [
        {"ts": f"2026-05-18T00:0{idx}:00Z", "phase": f"M{idx}", "status": "done", "notes": f"Fixture {profile['label']} phase {idx}."}
        for idx in range(1, 7)
    ]
    write(folder / "execution-log.jsonl", "\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n")


def run_generator(script: str, folder: Path) -> None:
    subprocess.run([sys.executable, str(SCRIPT_DIR / script), str(folder), "--quiet"], check=True, cwd=ROOT)


def build_fixture(profile_key: str) -> Path:
    profile = PROFILES[profile_key]
    folder = RESEARCH_ROOT / profile["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    markdown_files(folder, profile)
    yaml_artifacts(folder, profile)
    logs(folder, profile)
    write_profile(folder, profile)
    write(folder / "research-graph.json", json.dumps(graph(profile, folder), ensure_ascii=False, indent=2) + "\n")
    run_generator("decision_rubric.py", folder)
    run_generator("dashboard_manifest.py", folder)
    # validation-report.yaml validates its own presence in the evidence tab, so
    # a second pass makes --check stable on first fixture creation.
    run_generator("dashboard_manifest.py", folder)
    return folder


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate profile Gold fixtures")
    parser.add_argument("--profiles", nargs="*", default=["bench", "market", "product", "mapping"], choices=sorted(PROFILES))
    args = parser.parse_args()

    for profile_key in args.profiles:
        folder = build_fixture(profile_key)
        print(folder.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
