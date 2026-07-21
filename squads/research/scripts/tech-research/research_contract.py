#!/usr/bin/env python3
"""research_contract.py — emits the local research intelligence contract.

The base contract is intentionally agnostic. This generator makes every new
research declare its own local contract from already-produced artifacts instead
of relying on a hand-authored template.
"""

from __future__ import annotations

import argparse
import json
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


PROFILE_KIND: dict[str, dict[str, Any]] = {
    "tech": {
        "research_kind": "technical_decision_research",
        "method_family": "decision_readiness",
        "unit_of_analysis": "technical alternative, architecture option, risk, capability or implementation path",
        "dimension_source": "research-profile.yaml dimension pack plus decision-rubric.yaml criteria",
        "criteria": [
            "implementation readiness",
            "integration fit",
            "operational risk",
            "maintainability",
            "evidence strength",
            "strategic leverage",
        ],
    },
    "bench": {
        "research_kind": "comparative_benchmark_research",
        "method_family": "weighted_rubric",
        "unit_of_analysis": "player, product, provider, framework or comparable alternative",
        "dimension_source": "bench/profile-specific dimension pack and detected comparison matrices",
        "criteria": [
            "feature depth",
            "user experience",
            "pricing and TCO",
            "integration ecosystem",
            "support reliability",
            "market fit",
        ],
    },
    "market": {
        "research_kind": "market_map_research",
        "method_family": "coverage_gate",
        "unit_of_analysis": "market category, player, demand signal, channel, segment or opportunity",
        "dimension_source": "market profile taxonomy plus sources, claims and matrices",
        "criteria": [
            "category strength",
            "demand signal",
            "differentiation",
            "channel access",
            "timing",
            "risk exposure",
        ],
    },
    "product": {
        "research_kind": "product_decision_research",
        "method_family": "actionability_score",
        "unit_of_analysis": "product bet, feature, roadmap item, user need or positioning option",
        "dimension_source": "product profile taxonomy plus actions, claims and decision ledger",
        "criteria": [
            "user value",
            "business impact",
            "build effort",
            "retention leverage",
            "strategic fit",
            "learning value",
        ],
    },
    "mapping": {
        "research_kind": "operational_mapping_research",
        "method_family": "operating_system_blueprint",
        "unit_of_analysis": "actor, process step, dependency, bottleneck, system component or leverage point",
        "dimension_source": "mapping profile taxonomy plus graph, matrices and open questions",
        "criteria": [
            "leverage",
            "bottleneck severity",
            "automation potential",
            "dependency risk",
            "evidence strength",
            "next step clarity",
        ],
    },
}

BASE_THRESHOLDS: dict[str, dict[str, int]] = {
    "files": {"minimum": 12, "preferred": 20},
    "words": {"minimum": 5000, "preferred": 12000},
    "sources": {"minimum": 8, "preferred": 20},
    "waves": {"minimum": 0, "preferred": 3},
    "graph_nodes": {"minimum": 8, "preferred": 30},
    "graph_edges": {"minimum": 8, "preferred": 30},
    "gold_artifacts": {"minimum": 3, "preferred": 9},
}


def today() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")


def read_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def read_yaml(path: Path) -> dict[str, Any]:
    if not path.exists() or yaml is None:
        return {}
    try:
        data = yaml.safe_load(read_text(path))
    except yaml.YAMLError:
        return {}
    return data if isinstance(data, dict) else {}


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(read_text(path))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def clean_text(value: Any, limit: int = 300) -> str:
    text = str(value or "")
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[`*_>#]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def first_meaningful_line(markdown: str) -> str:
    for line in markdown.splitlines():
        stripped = clean_text(line)
        if not stripped:
            continue
        if stripped.lower() in {"metadata", "sumário", "summary", "tl;dr"}:
            continue
        return stripped
    return ""


def list_files(folder: Path) -> list[Path]:
    return sorted(path for path in folder.rglob("*") if path.is_file())


def word_count(files: list[Path]) -> int:
    total = 0
    for path in files:
        if path.suffix.lower() != ".md":
            continue
        total += len(re.findall(r"\S+", read_text(path)))
    return total


def source_count(sources: dict[str, Any]) -> int:
    rows = sources.get("sources")
    return len(rows) if isinstance(rows, list) else 0


def wave_count(files: list[Path], folder: Path) -> int:
    return len([path for path in files if re.match(r"wave-.*summary\.md$", path.relative_to(folder).as_posix())])


def graph_counts(graph: dict[str, Any]) -> tuple[int, int]:
    nodes = graph.get("nodes")
    edges = graph.get("edges") or graph.get("links")
    return (len(nodes) if isinstance(nodes, list) else 0, len(edges) if isinstance(edges, list) else 0)


def existing_gold_artifacts(folder: Path) -> list[str]:
    candidates = [
        "research-profile.yaml",
        "decision-rubric.yaml",
        "validation-report.yaml",
        "dashboard-manifest.yaml",
        "action-plan.yaml",
        "claims.yaml",
        "decision-ledger.yaml",
        "risk-register.yaml",
        "research-graph.json",
        "players.yaml",
        "matrices.yaml",
    ]
    return [name for name in candidates if (folder / name).exists()]


def threshold_for(_actual: int, base: dict[str, int], floor_preferred: int | None = None) -> dict[str, int]:
    minimum = base["minimum"]
    preferred = max(base["preferred"], floor_preferred or base["preferred"])
    return {"minimum": minimum, "preferred": preferred}


def categories_from_artifacts(profile_type: str, players: dict[str, Any], matrices: dict[str, Any], claims: dict[str, Any]) -> list[str]:
    categories: list[str] = []
    for player in players.get("players") or []:
        if isinstance(player, dict) and player.get("category"):
            categories.append(clean_text(player["category"], 80))
    for matrix in matrices.get("matrices") or []:
        if isinstance(matrix, dict) and matrix.get("title"):
            categories.append(clean_text(matrix["title"], 80))
    for claim in claims.get("claims") or []:
        if isinstance(claim, dict) and claim.get("type"):
            categories.append(clean_text(claim["type"], 80))
    if not categories:
        categories = [profile_type, "evidence", "actionability"]
    deduped: list[str] = []
    seen: set[str] = set()
    for category in categories:
        key = category.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(category)
    return deduped[:12]


def objective_from_docs(folder: Path, profile: dict[str, Any]) -> str:
    report_line = first_meaningful_line(read_text(folder / "02-research-report.md"))
    readme_line = first_meaningful_line(read_text(folder / "README.md"))
    primary = ((profile.get("profile") or {}).get("primary_question") or "").strip()
    return clean_text(report_line or readme_line or primary or f"Responder à pesquisa {folder.name}.", 360)


def build_contract(folder: Path) -> dict[str, Any]:
    files = list_files(folder)
    profile = read_yaml(folder / "research-profile.yaml")
    decision_rubric = read_yaml(folder / "decision-rubric.yaml")
    dashboard_manifest = read_yaml(folder / "dashboard-manifest.yaml")
    sources = read_yaml(folder / "sources.yaml")
    players = read_yaml(folder / "players.yaml")
    matrices = read_yaml(folder / "matrices.yaml")
    claims = read_yaml(folder / "claims.yaml")
    graph = read_json(folder / "research-graph.json")

    profile_type = str((profile.get("profile") or {}).get("type") or "tech")
    kind = PROFILE_KIND.get(profile_type, PROFILE_KIND["tech"])
    graph_nodes, graph_edges = graph_counts(graph)
    gold_artifacts = existing_gold_artifacts(folder)
    quality = dashboard_manifest.get("quality_bars") or {}
    rubric_status = str(decision_rubric.get("status") or "missing")
    decision_mode = str((profile.get("profile") or {}).get("decision_mode") or "unknown")
    primary_question = str((profile.get("profile") or {}).get("primary_question") or "Qual decisão a pesquisa precisa sustentar?")

    dimensions = decision_rubric.get("dimensions")
    if isinstance(dimensions, list) and dimensions:
        criteria = [clean_text(item.get("name") or item.get("id") or item, 120) if isinstance(item, dict) else clean_text(item, 120) for item in dimensions]
    else:
        criteria = list(kind["criteria"])

    return {
        "schema": "sinkra.research-local-contract.v1",
        "generated_at": today(),
        "generator": "tech-research/research_contract.py",
        "derived_from_research": True,
        "research_kind": kind["research_kind"],
        "objective": objective_from_docs(folder, profile),
        "decision_context": {
            "primary_decision": clean_text(primary_question, 300),
            "consumer": "Research Observatory, PM, analyst, architecture or execution owner",
            "profile_type": profile_type,
            "decision_mode": decision_mode,
            "dashboard_gold_reference": int(quality.get("dashboard_readiness_score") or 0) >= 100,
        },
        "thresholds": {
            "files": threshold_for(len(files), BASE_THRESHOLDS["files"]),
            "words": threshold_for(word_count(files), BASE_THRESHOLDS["words"]),
            "sources": threshold_for(source_count(sources), BASE_THRESHOLDS["sources"]),
            "waves": threshold_for(wave_count(files, folder), BASE_THRESHOLDS["waves"]),
            "graph_nodes": threshold_for(graph_nodes, BASE_THRESHOLDS["graph_nodes"]),
            "graph_edges": threshold_for(graph_edges, BASE_THRESHOLDS["graph_edges"]),
            "gold_artifacts": threshold_for(len(gold_artifacts), BASE_THRESHOLDS["gold_artifacts"], 9),
        },
        "taxonomy": {
            "categories": categories_from_artifacts(profile_type, players, matrices, claims),
            "unit_of_analysis": kind["unit_of_analysis"],
            "dimension_source": kind["dimension_source"],
        },
        "rubric_model": {
            "method_family": str((decision_rubric.get("model") or {}).get("method_family") or kind["method_family"]),
            "score_semantics": "Score measures fit to the declared decision context and dashboard readiness; it is not a universal truth score.",
            "dimensions_or_criteria": criteria,
            "pass_or_saturation_rule": "Pass when the local contract fields are present, core artifacts exist, evidence is traceable and remaining gaps are explicit.",
        },
        "evidence_model": {
            "primary_evidence": [
                "sources.yaml",
                "claims.yaml",
                "research-graph.json",
                "02-research-report.md",
                "03-recommendations.md",
            ],
            "claim_trace_required": True,
            "known_weakness": "Generated deterministically from local artifacts; human-authored contracts may tighten thresholds or method semantics for exceptional researches.",
        },
        "stop_rules": {
            "stop_when": [
                "declared objective is answered or bounded",
                "sources, graph, claims or limitations make evidence strength inspectable",
                "actions, decisions or next questions are explicit",
            ],
            "do_not_stop_when": [
                "research-contract.json is missing",
                "dashboard has empty high-value tabs without an explicit limitation",
                "rubric or saturation method is implicit",
            ],
        },
        "dashboard_value_model": {
            "render_tier_target": "gold",
            "gold_artifacts_present": gold_artifacts,
            "decision_rubric_status": rubric_status,
            "dashboard_readiness_score": quality.get("dashboard_readiness_score"),
            "artifact_completeness_score": quality.get("artifact_completeness_score"),
        },
    }


def dump_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def write_atomic(path: Path, payload: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate research-contract.json")
    parser.add_argument("folder")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--stdout", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        sys.stderr.write(f"error: folder not found: {folder}\n")
        return 2

    payload = dump_json(build_contract(folder))
    target = folder / "research-contract.json"

    if args.stdout:
        sys.stdout.write(payload)
        return 0

    stale = not target.exists() or target.read_text(encoding="utf-8") != payload
    if args.check:
        if stale and not args.quiet:
            sys.stderr.write("stale dashboard artifact: research-contract.json\n")
        return 1 if stale else 0

    if stale:
        write_atomic(target, payload)
    if not args.quiet:
        print("generated research-contract.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
