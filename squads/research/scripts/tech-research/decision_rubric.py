#!/usr/bin/env python3
"""decision_rubric.py — derives a weighted decision rubric for any research.

The existing `metrics.yaml.rubrics` object is a quality gate for the research
itself. This generator emits a separate decision artifact for evaluating
alternatives found during the research.

Inputs are intentionally limited to local artifacts:
  - research-profile.yaml
  - players.yaml
  - matrices.yaml
  - claims.yaml
  - sources.yaml

No network, no LLM, deterministic output.
"""

from __future__ import annotations

import argparse
import math
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


BASE_WEIGHTS = {"D1": 1.0, "D2": 1.0, "D3": 1.0, "D4": 1.0, "D5": 1.0, "D6": 1.0}

DIMENSION_PACKS: dict[str, dict[str, Any]] = {
    "tech": {
        "label": "Tech",
        "categories": [
            {"id": "C01", "name": "Execução técnica", "dimensions": ["D1", "D3"]},
            {"id": "C02", "name": "Evidência e Risco", "dimensions": ["D2", "D5"]},
            {"id": "C03", "name": "Arquitetura", "dimensions": ["D4", "D6"]},
        ],
        "dimensions": [
            {"id": "D1", "name": "Implementation Readiness", "category": "C01", "description": "Prontidão para virar implementação, spike ou decisão técnica executável."},
            {"id": "D2", "name": "Evidence Strength", "category": "C02", "description": "Força das fontes, claims e rastreabilidade que sustentam a alternativa."},
            {"id": "D3", "name": "Operational Fit", "category": "C01", "description": "Encaixe no runtime, workflow e restrições operacionais do ambiente alvo."},
            {"id": "D4", "name": "Integration Fit", "category": "C03", "description": "Compatibilidade com arquitetura, integrações, runners, agentes ou toolchain."},
            {"id": "D5", "name": "Risk Control", "category": "C02", "description": "Clareza de limites, trade-offs, falhas prováveis e controles disponíveis."},
            {"id": "D6", "name": "Strategic Leverage", "category": "C03", "description": "Quanto a alternativa cria aprendizado reutilizável, vantagem técnica ou opcionalidade futura."},
        ],
        "presets": [
            {"key": "equal", "name": "Igual", "description": "Baseline neutro: todas as dimensões têm o mesmo peso.", "weights": BASE_WEIGHTS},
            {"key": "tech", "name": "Tech padrão", "description": "Equilibra execução, integração e risco para adoção técnica.", "weights": {"D1": 1.8, "D2": 1.1, "D3": 1.6, "D4": 1.7, "D5": 1.3, "D6": 1.1}},
            {"key": "builder_now", "name": "Construir agora", "description": "Prioriza encaixe operacional e prontidão de implementação.", "weights": {"D1": 2.2, "D2": 1.0, "D3": 2.0, "D4": 1.2, "D5": 1.0, "D6": 0.8}},
            {"key": "architecture_first", "name": "Arquitetura primeiro", "description": "Prioriza compatibilidade, alavancagem e risco controlado.", "weights": {"D1": 1.0, "D2": 1.0, "D3": 0.9, "D4": 2.3, "D5": 1.6, "D6": 1.8}},
            {"key": "evidence_strict", "name": "Evidência estrita", "description": "Prioriza alternativas com fonte, claim e rastreabilidade fortes.", "weights": {"D1": 0.9, "D2": 2.5, "D3": 0.8, "D4": 1.0, "D5": 1.8, "D6": 1.0}},
            {"key": "risk_managed", "name": "Risco controlado", "description": "Prioriza alternativas com limites claros e menor incerteza operacional.", "weights": {"D1": 1.0, "D2": 1.4, "D3": 1.0, "D4": 1.2, "D5": 2.4, "D6": 0.9}},
        ],
    },
    "bench": {
        "label": "Bench",
        "categories": [
            {"id": "C01", "name": "Produto", "dimensions": ["D1", "D2"]},
            {"id": "C02", "name": "Comercial", "dimensions": ["D3", "D6"]},
            {"id": "C03", "name": "Operação", "dimensions": ["D4", "D5"]},
        ],
        "dimensions": [
            {"id": "D1", "name": "Feature Depth", "category": "C01", "description": "Profundidade e amplitude das capacidades relevantes para o caso de uso."},
            {"id": "D2", "name": "UX Quality", "category": "C01", "description": "Facilidade de uso, onboarding e velocidade até o primeiro resultado útil."},
            {"id": "D3", "name": "Pricing & TCO", "category": "C02", "description": "Custo total, modelo comercial, limites de plano e previsibilidade financeira."},
            {"id": "D4", "name": "Integration Ecosystem", "category": "C03", "description": "APIs, integrações, exportação, compatibilidade e encaixe no stack existente."},
            {"id": "D5", "name": "Support Reliability", "category": "C03", "description": "SLA, suporte, documentação, comunidade e confiabilidade operacional."},
            {"id": "D6", "name": "Market Fit", "category": "C02", "description": "Aderência ao segmento, maturidade, canal, tração e momento competitivo."},
        ],
        "presets": [
            {"key": "equal", "name": "Igual", "description": "Baseline neutro para comparar todos os players.", "weights": BASE_WEIGHTS},
            {"key": "bench", "name": "Bench padrão", "description": "Ranking equilibrado para seleção comparativa.", "weights": {"D1": 1.4, "D2": 1.2, "D3": 1.1, "D4": 1.2, "D5": 1.0, "D6": 1.1}},
            {"key": "creator", "name": "Creator", "description": "Valoriza UX, preço e fit de mercado.", "weights": {"D1": 0.8, "D2": 2.0, "D3": 1.8, "D4": 0.4, "D5": 0.8, "D6": 1.4}},
            {"key": "enterprise", "name": "Enterprise", "description": "Valoriza suporte, integração e redução de risco.", "weights": {"D1": 1.1, "D2": 0.8, "D3": 0.5, "D4": 2.0, "D5": 2.2, "D6": 0.8}},
            {"key": "best_value", "name": "Melhor custo-benefício", "description": "Prioriza preço sem ignorar capacidades essenciais.", "weights": {"D1": 1.2, "D2": 1.1, "D3": 2.4, "D4": 0.9, "D5": 0.8, "D6": 1.0}},
            {"key": "best_product", "name": "Melhor produto", "description": "Prioriza capacidade, UX e ecossistema.", "weights": {"D1": 2.1, "D2": 1.8, "D3": 0.6, "D4": 1.5, "D5": 0.8, "D6": 1.0}},
        ],
    },
    "market": {
        "label": "Mercado",
        "categories": [
            {"id": "C01", "name": "Demanda", "dimensions": ["D1", "D2"]},
            {"id": "C02", "name": "Competição", "dimensions": ["D3", "D6"]},
            {"id": "C03", "name": "Go-to-market", "dimensions": ["D4", "D5"]},
        ],
        "dimensions": [
            {"id": "D1", "name": "Category Strength", "category": "C01", "description": "Força da categoria, clareza do problema e densidade de players."},
            {"id": "D2", "name": "Demand Signal", "category": "C01", "description": "Sinais de demanda, dores explícitas, busca, comunidades, compra ou adoção."},
            {"id": "D3", "name": "Differentiation", "category": "C02", "description": "Espaço para posicionamento distinto e vantagem defensável."},
            {"id": "D4", "name": "Channel Access", "category": "C03", "description": "Acesso a canais, audiência, parcerias, distribuição ou aquisição."},
            {"id": "D5", "name": "Timing", "category": "C03", "description": "Momento de mercado, janela competitiva e urgência do movimento."},
            {"id": "D6", "name": "Risk Exposure", "category": "C02", "description": "Risco competitivo, regulatório, operacional ou de commoditização."},
        ],
        "presets": [
            {"key": "equal", "name": "Igual", "description": "Baseline neutro para mapear oportunidade.", "weights": BASE_WEIGHTS},
            {"key": "market", "name": "Mercado padrão", "description": "Equilibra demanda, diferenciação, canal e timing.", "weights": {"D1": 1.3, "D2": 1.6, "D3": 1.3, "D4": 1.1, "D5": 1.1, "D6": 1.0}},
            {"key": "demand_first", "name": "Demanda primeiro", "description": "Prioriza sinais de demanda antes de estratégia.", "weights": {"D1": 1.7, "D2": 2.3, "D3": 0.9, "D4": 0.9, "D5": 1.0, "D6": 0.8}},
            {"key": "positioning_gap", "name": "Gap de posicionamento", "description": "Busca brechas defensáveis no mapa competitivo.", "weights": {"D1": 1.0, "D2": 1.1, "D3": 2.4, "D4": 1.2, "D5": 0.9, "D6": 1.4}},
            {"key": "gtm_now", "name": "GTM agora", "description": "Valoriza canal acessível e timing favorável.", "weights": {"D1": 1.0, "D2": 1.3, "D3": 1.0, "D4": 2.2, "D5": 1.8, "D6": 0.8}},
            {"key": "risk_aware", "name": "Risco competitivo", "description": "Penaliza exposição e commoditização.", "weights": {"D1": 1.0, "D2": 1.1, "D3": 1.3, "D4": 0.9, "D5": 1.0, "D6": 2.4}},
        ],
    },
    "product": {
        "label": "Produto",
        "categories": [
            {"id": "C01", "name": "Valor", "dimensions": ["D1", "D6"]},
            {"id": "C02", "name": "Negócio", "dimensions": ["D2", "D5"]},
            {"id": "C03", "name": "Entrega", "dimensions": ["D3", "D4"]},
        ],
        "dimensions": [
            {"id": "D1", "name": "User Value", "category": "C01", "description": "Valor percebido, intensidade da dor e utilidade para o usuário final."},
            {"id": "D2", "name": "Business Impact", "category": "C02", "description": "Impacto em receita, ativação, retenção, margem ou vantagem comercial."},
            {"id": "D3", "name": "Build Effort", "category": "C03", "description": "Esforço, complexidade, dependências e tempo até entrega."},
            {"id": "D4", "name": "Delivery Confidence", "category": "C03", "description": "Confiança de implementação com equipe, stack e restrições atuais."},
            {"id": "D5", "name": "Strategic Fit", "category": "C02", "description": "Aderência ao posicionamento, roadmap, tese de produto e modelo de negócio."},
            {"id": "D6", "name": "Learning Value", "category": "C01", "description": "Quanto a alternativa acelera aprendizado validável sobre usuário, oferta ou mercado."},
        ],
        "presets": [
            {"key": "equal", "name": "Igual", "description": "Baseline neutro para priorização.", "weights": BASE_WEIGHTS},
            {"key": "product", "name": "Produto padrão", "description": "Equilibra valor, negócio, entrega e aprendizado.", "weights": {"D1": 1.6, "D2": 1.4, "D3": 1.0, "D4": 1.1, "D5": 1.2, "D6": 1.3}},
            {"key": "user_value", "name": "Valor do usuário", "description": "Prioriza dor, utilidade e aprendizado.", "weights": {"D1": 2.4, "D2": 1.0, "D3": 0.8, "D4": 0.9, "D5": 1.0, "D6": 1.8}},
            {"key": "business_case", "name": "Caso de negócio", "description": "Prioriza impacto e fit estratégico.", "weights": {"D1": 1.2, "D2": 2.3, "D3": 0.8, "D4": 0.9, "D5": 1.9, "D6": 0.9}},
            {"key": "fast_learning", "name": "Aprendizado rápido", "description": "Valoriza baixo esforço, entrega e aprendizado.", "weights": {"D1": 1.2, "D2": 0.8, "D3": 1.8, "D4": 1.6, "D5": 0.8, "D6": 2.2}},
            {"key": "roadmap_fit", "name": "Roadmap fit", "description": "Prioriza coerência estratégica e capacidade de entrega.", "weights": {"D1": 1.0, "D2": 1.3, "D3": 1.1, "D4": 1.4, "D5": 2.3, "D6": 0.9}},
        ],
    },
    "mapping": {
        "label": "Mapeamento",
        "categories": [
            {"id": "C01", "name": "Alavancas", "dimensions": ["D1", "D3"]},
            {"id": "C02", "name": "Gargalos", "dimensions": ["D2", "D4"]},
            {"id": "C03", "name": "Próximo passo", "dimensions": ["D5", "D6"]},
        ],
        "dimensions": [
            {"id": "D1", "name": "Leverage", "category": "C01", "description": "Potencial de desbloquear valor, reduzir atrito ou ampliar capacidade do sistema."},
            {"id": "D2", "name": "Bottleneck Severity", "category": "C02", "description": "Gravidade do gargalo, impacto no fluxo e custo de manter como está."},
            {"id": "D3", "name": "Automation Potential", "category": "C01", "description": "Potencial de virar automação, padrão operacional, template ou contrato reutilizável."},
            {"id": "D4", "name": "Dependency Risk", "category": "C02", "description": "Dependências críticas, pontos únicos de falha e riscos de coordenação."},
            {"id": "D5", "name": "Evidence Strength", "category": "C03", "description": "Nível de evidência que sustenta a leitura do território."},
            {"id": "D6", "name": "Next Step Clarity", "category": "C03", "description": "Clareza do próximo experimento, investigação ou decisão após o mapa."},
        ],
        "presets": [
            {"key": "equal", "name": "Igual", "description": "Baseline neutro para ler o território.", "weights": BASE_WEIGHTS},
            {"key": "mapping", "name": "Mapeamento padrão", "description": "Equilibra alavanca, gargalo, evidência e próximo passo.", "weights": {"D1": 1.4, "D2": 1.5, "D3": 1.2, "D4": 1.2, "D5": 1.1, "D6": 1.4}},
            {"key": "leverage_first", "name": "Alavanca primeiro", "description": "Prioriza pontos com maior potencial de destravar valor.", "weights": {"D1": 2.4, "D2": 1.2, "D3": 1.7, "D4": 0.8, "D5": 0.9, "D6": 1.0}},
            {"key": "bottleneck_first", "name": "Gargalo primeiro", "description": "Prioriza onde o fluxo mais trava.", "weights": {"D1": 1.0, "D2": 2.4, "D3": 0.9, "D4": 1.8, "D5": 1.0, "D6": 0.9}},
            {"key": "automation_first", "name": "Automação", "description": "Valoriza padronização e automação reutilizável.", "weights": {"D1": 1.5, "D2": 1.0, "D3": 2.4, "D4": 1.0, "D5": 0.8, "D6": 1.2}},
            {"key": "investigate_next", "name": "Investigar depois", "description": "Prioriza evidência e clareza do próximo passo.", "weights": {"D1": 0.9, "D2": 1.1, "D3": 0.8, "D4": 1.0, "D5": 2.2, "D6": 2.0}},
        ],
    },
}

FIT_SCORE = {"high": 88, "medium": 68, "low": 42}
TIER_SCORE = {1: 92, 2: 72, 3: 45}
CATEGORY_BONUS = {
    "native-runtime": {"D1": 10, "D3": 8, "D4": 10},
    "runner-foundation": {"D1": 8, "D3": 12, "D5": 6},
    "supervisor-template": {"D1": 8, "D3": 10, "D6": 8},
    "reference-runtime": {"D2": 8, "D4": 6, "D6": 6},
    "orchestration-pattern": {"D4": 8, "D6": 10},
    "fanout-pattern": {"D4": 8, "D6": 6},
    "quality-baseline": {"D2": 8, "D5": 10},
}


def today() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def read_yaml(path: Path) -> dict[str, Any]:
    if not path.exists() or yaml is None:
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError):
        return {}
    return data if isinstance(data, dict) else {}


def clamp(value: float, low: int = 0, high: int = 100) -> int:
    return max(low, min(high, round(value)))


def normalize_slug(text: str) -> str:
    value = text.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-") or "unknown"


def fit_base(player: dict[str, Any]) -> int:
    fit = str(player.get("fit") or "").lower()
    tier = player.get("tier")
    candidates = []
    if fit in FIT_SCORE:
        candidates.append(FIT_SCORE[fit])
    if isinstance(tier, int) and tier in TIER_SCORE:
        candidates.append(TIER_SCORE[tier])
    return round(sum(candidates) / len(candidates)) if candidates else 55


def evidence_count_for(player: dict[str, Any], claims: list[dict[str, Any]]) -> int:
    name = str(player.get("name") or "").lower()
    if not name:
        return 0
    count = 0
    for claim in claims:
        haystack = " ".join(str(claim.get(k) or "") for k in ("claim", "summary", "title", "rationale")).lower()
        if name in haystack:
            count += 1
    return count


def selected_pack(profile: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    rubric_profile = profile.get("rubric_profile") if isinstance(profile.get("rubric_profile"), dict) else {}
    profile_node = profile.get("profile") if isinstance(profile.get("profile"), dict) else {}
    candidates = [
        str(rubric_profile.get("dimension_pack") or "").strip().lower(),
        str(profile_node.get("type") or "").strip().lower(),
    ]
    for candidate in candidates:
        if candidate in DIMENSION_PACKS:
            return candidate, DIMENSION_PACKS[candidate]
    return "tech", DIMENSION_PACKS["tech"]


def score_player(
    player: dict[str, Any],
    claims: list[dict[str, Any]],
    dimensions: list[dict[str, Any]],
) -> tuple[dict[str, int], dict[str, list[dict[str, str]]]]:
    base = fit_base(player)
    category = str(player.get("category") or "")
    excluded = bool(player.get("excluded"))
    has_source = bool(player.get("source_url"))
    additional_sources = player.get("additional_sources") if isinstance(player.get("additional_sources"), list) else []
    claim_hits = evidence_count_for(player, claims)

    scores = {
        "D1": base,
        "D2": 45 + (25 if has_source else 0) + min(15, len(additional_sources) * 5) + min(15, claim_hits * 5),
        "D3": base + (8 if player.get("action") else 0) + (6 if player.get("what_it_does") else 0),
        "D4": base + (8 if category in {"native-runtime", "reference-runtime", "orchestration-pattern", "fanout-pattern"} else 0),
        "D5": 58 + (10 if player.get("what_it_does_not") else 0) + (8 if claim_hits else 0),
        "D6": base + (8 if player.get("role") else 0) + (8 if player.get("insight") else 0),
    }

    for dim, bonus in CATEGORY_BONUS.get(category, {}).items():
        scores[dim] = scores.get(dim, base) + bonus

    if excluded:
        scores = {dim: min(value, 35) for dim, value in scores.items()}

    evidence_ref = {
        "artifact": str(player.get("first_seen_in") or "players.yaml"),
        "section": str(player.get("section") or player.get("number") or ""),
    }
    refs = {str(dim["id"]): [evidence_ref.copy()] for dim in dimensions}
    if has_source:
        for dim in ("D2", "D5"):
            refs[dim].append({"artifact": "players.yaml", "source_url": str(player.get("source_url"))})
    if claim_hits:
        for dim in ("D2", "D5"):
            refs[dim].append({"artifact": "claims.yaml", "match_count": str(claim_hits)})

    return {dim: clamp(value) for dim, value in scores.items()}, refs


def weighted_score(scores: dict[str, int], weights: dict[str, float]) -> float:
    numerator = 0.0
    denominator = 0.0
    for dim_id, value in scores.items():
        weight = float(weights.get(dim_id, 0))
        numerator += weight * float(value)
        denominator += weight
    return numerator / denominator if denominator else 0.0


def build_rankings(players: list[dict[str, Any]], presets: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    rankings: dict[str, list[dict[str, Any]]] = {}
    for preset in presets:
        rows = []
        for player in players:
            rows.append(
                {
                    "player_id": player["id"],
                    "player_name": player["name"],
                    "score": round(weighted_score(player["scores"], preset["weights"]), 2),
                }
            )
        rows.sort(key=lambda row: (-row["score"], row["player_name"].lower()))
        for idx, row in enumerate(rows, start=1):
            row["rank"] = idx
        rankings[preset["key"]] = rows
    return rankings


def closest_preset(weights: dict[str, float], presets: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(float(v) for v in weights.values())
    current = {dim: (float(value) / total * 100) if total else 0 for dim, value in weights.items()}
    best = presets[0]
    best_dist = math.inf
    for preset in presets:
        preset_total = sum(float(v) for v in preset["weights"].values())
        dist = 0.0
        for dim_id in weights:
            normalized = float(preset["weights"].get(dim_id, 0)) / preset_total * 100 if preset_total else 0
            diff = current[dim_id] - normalized
            dist += diff * diff
        dist = math.sqrt(dist)
        if dist < best_dist:
            best = preset
            best_dist = dist
    return {"preset_key": best["key"], "preset_name": best["name"], "match": clamp(100 - best_dist * 1.4)}


def build_decision_rubric(folder: Path) -> dict[str, Any]:
    research_profile = read_yaml(folder / "research-profile.yaml")
    pack_key, pack = selected_pack(research_profile)
    categories = pack["categories"]
    dimensions = pack["dimensions"]
    presets = pack["presets"]
    players_yaml = read_yaml(folder / "players.yaml")
    claims_yaml = read_yaml(folder / "claims.yaml")
    matrices_yaml = read_yaml(folder / "matrices.yaml")

    raw_players = [
        player
        for player in players_yaml.get("players", [])
        if isinstance(player, dict) and not player.get("excluded")
    ]
    claims = [claim for claim in claims_yaml.get("claims", []) if isinstance(claim, dict)]
    matrix_count = len(matrices_yaml.get("matrices") or [])

    rubric_players = []
    for idx, player in enumerate(raw_players, start=1):
        scores, evidence_refs = score_player(player, claims, dimensions)
        rubric_players.append(
            {
                "id": str(player.get("id") or f"player-{idx:03d}"),
                "name": str(player.get("name") or f"Player {idx}"),
                "category": player.get("category") or "uncategorized",
                "tier": player.get("tier"),
                "fit": player.get("fit"),
                "scores": scores,
                "evidence_refs": evidence_refs,
                "rationale": player.get("insight") or player.get("action") or player.get("role"),
            }
        )

    is_applicable = len(rubric_players) >= 2
    default_weights = dict(presets[0]["weights"])
    rankings = build_rankings(rubric_players, presets) if is_applicable else {}

    return {
        "schema_version": "aiox-decision-rubric-v1",
        "research_slug": folder.name,
        "generator": "tech-research/decision_rubric.py",
        "generated_at": today(),
        "derived_from_research": True,
        "profile": {
            "type": pack_key,
            "label": pack["label"],
            "source_artifact": "research-profile.yaml" if research_profile else "fallback",
            "confidence": str((research_profile.get("profile") or {}).get("confidence") or "unknown")
            if isinstance(research_profile.get("profile"), dict)
            else "unknown",
        },
        "status": "applicable" if is_applicable else "not_applicable",
        "applicability": {
            "has_players": len(rubric_players) > 0,
            "player_count": len(rubric_players),
            "matrix_count": matrix_count,
            "claim_count": len(claims),
            "minimum_players_required": 2,
            "reason": "comparative_players_detected" if is_applicable else "requires_at_least_two_included_players",
        },
        "model": {
            "purpose": "Avaliar alternativas encontradas pela pesquisa sob diferentes pesos de decisão.",
            "formula": "score(player) = sum(weight[D] * score[player][D]) / sum(weight[D])",
            "score_scale": "0-100",
            "weight_scale": {"min": 0, "base": 1, "max": 2.5},
            "dimension_pack": pack_key,
            "important_distinction": "Este artefato não substitui metrics.yaml.rubrics; metrics.yaml.rubrics mede qualidade da pesquisa, decision-rubric.yaml mede alternativas.",
        },
        "categories": categories,
        "dimensions": dimensions,
        "presets": presets,
        "baseline_weights": default_weights,
        "closest_preset_for_baseline": closest_preset(default_weights, presets),
        "players": rubric_players,
        "rankings": rankings,
        "limitations": [
            "Scores são heurísticos e derivados dos artefatos locais; não representam benchmark formal célula-a-célula.",
            "Bench/Duelo pode reutilizar este contrato, mas deve exigir evidência mais profunda por dimensão.",
            "Pesquisas sem pelo menos dois players incluídos geram status not_applicable para não inventar comparação.",
        ],
    }


def dump_yaml(value: Any) -> str:
    if yaml is None:
        raise RuntimeError("PyYAML is required")

    class NoAliasDumper(yaml.SafeDumper):
        def ignore_aliases(self, data: Any) -> bool:
            return True

    return yaml.dump(value, Dumper=NoAliasDumper, allow_unicode=True, sort_keys=False, width=120)


def write_atomic(path: Path, payload: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate decision-rubric.yaml")
    parser.add_argument("folder")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--stdout", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        sys.stderr.write(f"error: folder not found: {folder}\n")
        return 2

    payload = dump_yaml(build_decision_rubric(folder))

    if args.stdout:
        sys.stdout.write(payload)
        return 0

    target = folder / "decision-rubric.yaml"
    stale = not target.exists() or target.read_text(encoding="utf-8") != payload
    if args.check:
        if stale and not args.quiet:
            sys.stderr.write("stale dashboard artifact: decision-rubric.yaml\n")
        return 1 if stale else 0

    if stale:
        write_atomic(target, payload)
    if not args.quiet:
        print("generated decision-rubric.yaml")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
