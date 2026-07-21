#!/usr/bin/env python3
"""dashboard_manifest.py — emits dashboard-manifest.yaml and validation-report.yaml.

This is the EPIC-150 bridge between generated artifacts and the visual Research
Observatory. It turns "files exist" into explicit tab readiness and validation
checks that can be inspected in the dashboard.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None  # type: ignore[assignment]


TAB_CONTRACT: dict[str, dict[str, Any]] = {
    "map": {
        "primary_artifacts": ["README.md", "research-profile.yaml", "metrics.yaml", "pipeline-state.yaml", "research-graph.json", "matrices.yaml"],
        "expected_value": "Decisão executiva, qualidade do run e prontidão visual.",
    },
    "recommendations": {
        "primary_artifacts": ["03-recommendations.md", "action-plan.yaml", "quick-wins.md", "risk-register.yaml", "decision-ledger.yaml"],
        "expected_value": "Plano de ação, roadmap, riscos e decisões.",
    },
    "evidence": {
        "primary_artifacts": ["sources.yaml", "research-graph.json", "claims.yaml", "validation-report.yaml"],
        "expected_value": "Rastreabilidade de claims, fontes e validação.",
    },
    "waves": {
        "primary_artifacts": ["execution-log.jsonl"],
        "expected_value": "Evolução da conclusão por evento e wave.",
    },
    "sources": {
        "primary_artifacts": ["sources.yaml"],
        "expected_value": "Fontes datadas, classificadas e auditáveis.",
    },
    "players": {
        "primary_artifacts": ["players.yaml", "decision-rubric.yaml"],
        "expected_value": "Peças para usar agora vs padrões de referência, com Rubrica ponderada quando houver alternativas suficientes.",
    },
    "curiosity": {
        "primary_artifacts": ["curiosity_queue.yaml"],
        "expected_value": "Dúvidas que podem mudar a decisão.",
    },
    "document": {
        "primary_artifacts": ["README.md"],
        "expected_value": "Auditoria direta dos artefatos brutos.",
    },
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


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            rows.append(parsed)
    return rows


def normalize_score(value: Any) -> int:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0
    if 0 < number <= 1:
        number *= 100
    return max(0, min(100, round(number)))


def tab_status(folder: Path, artifacts: list[str]) -> tuple[str, list[str]]:
    present = [artifact for artifact in artifacts if (folder / artifact).exists()]
    ratio = len(present) / max(1, len(artifacts))
    if ratio >= 1:
        return "complete", present
    if ratio >= 0.6:
        return "rich", present
    if ratio > 0:
        return "partial", present
    return "missing", present


def build_manifest(folder: Path) -> dict[str, Any]:
    metrics = read_yaml(folder / "metrics.yaml")
    research_profile = read_yaml(folder / "research-profile.yaml")
    graph = read_json(folder / "research-graph.json")
    sources = read_yaml(folder / "sources.yaml")
    action_plan = read_yaml(folder / "action-plan.yaml")
    players = read_yaml(folder / "players.yaml")
    claims = read_yaml(folder / "claims.yaml")
    decision_rubric = read_yaml(folder / "decision-rubric.yaml")
    research_contract = read_json(folder / "research-contract.json")

    tabs = {}
    for tab, contract in TAB_CONTRACT.items():
        status, present = tab_status(folder, contract["primary_artifacts"])
        tabs[tab] = {
            "status": status,
            "primary_artifacts": contract["primary_artifacts"],
            "present_artifacts": present,
            "missing_artifacts": [artifact for artifact in contract["primary_artifacts"] if artifact not in present],
            "expected_value": contract["expected_value"],
        }

    sources_count = len(sources.get("sources") or [])
    graph_nodes = len(graph.get("nodes") or [])
    graph_edges = len(graph.get("edges") or graph.get("links") or [])
    actions_count = len(action_plan.get("actions") or [])
    players_count = len(players.get("players") or [])
    claims_count = len(claims.get("claims") or [])
    rubric_players_count = len(decision_rubric.get("players") or [])
    profile_type = (research_profile.get("profile") or {}).get("type", "missing")
    rubric_dimension_pack = (decision_rubric.get("model") or {}).get("dimension_pack", "missing")
    research_kind = research_contract.get("research_kind", "missing")
    rubric_method = (research_contract.get("rubric_model") or {}).get("method_family", "missing")

    artifact_score = round(sum(1 for tab in tabs.values() if tab["status"] in {"complete", "rich"}) / max(1, len(tabs)) * 100)
    base_readiness_score = round(
        (
            min(100, sources_count * 8)
            + min(100, graph_nodes * 4)
            + min(100, graph_edges * 2)
            + min(100, actions_count * 20)
            + min(100, players_count * 12)
            + min(100, claims_count * 20)
        )
        / 6
    )
    rubric_bonus = 3 if decision_rubric.get("status") in {"applicable", "not_applicable"} else 0
    readiness_score = min(100, base_readiness_score + rubric_bonus)

    return {
        "schema_version": "aiox-research-dashboard-manifest-v1",
        "research_slug": folder.name,
        "generated_at": today(),
        "derived_from_research": True,
        "tabs": tabs,
        "quality_bars": {
            "coverage_score": normalize_score(metrics.get("coverage_score", artifact_score)),
            "integrity_score": normalize_score(metrics.get("integrity_score", artifact_score)),
            "artifact_completeness_score": artifact_score,
            "dashboard_readiness_score": readiness_score,
        },
        "gold_evidence": {
            "sources": sources_count,
            "graph_nodes": graph_nodes,
            "graph_edges": graph_edges,
            "actions": actions_count,
            "players": players_count,
            "claims": claims_count,
            "rubric_players": rubric_players_count,
            "decision_rubric_status": decision_rubric.get("status", "missing"),
            "research_profile_type": profile_type,
            "rubric_dimension_pack": rubric_dimension_pack,
            "research_contract": "present" if research_contract else "missing",
            "research_kind": research_kind,
            "rubric_method": rubric_method,
        },
    }


def check(name: str, status: str, message: str, evidence: list[str] | None = None) -> dict[str, Any]:
    item: dict[str, Any] = {"id": name, "check": name, "status": status, "message": message}
    if evidence:
        item["evidence"] = evidence
    return item


def build_validation_report(folder: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    for tab, data in manifest["tabs"].items():
        missing = data["missing_artifacts"]
        checks.append(
            check(
                f"TAB-{tab}",
                "pass" if not missing else "warn",
                f"{tab}: {data['status']} ({len(data['present_artifacts'])}/{len(data['primary_artifacts'])} artifacts present)",
                data["present_artifacts"],
            )
        )

    graph = read_json(folder / "research-graph.json")
    graph_edges = graph.get("edges") or graph.get("links") or []
    checks.append(check("GRAPH-EDGES", "pass" if graph_edges else "warn", f"{len(graph_edges)} graph edges detected."))

    actions = read_yaml(folder / "action-plan.yaml").get("actions") or []
    risks = read_yaml(folder / "risk-register.yaml").get("risks") or []
    claims = read_yaml(folder / "claims.yaml").get("claims") or []
    decisions = read_yaml(folder / "decision-ledger.yaml").get("decisions") or []
    research_profile = read_yaml(folder / "research-profile.yaml")
    decision_rubric = read_yaml(folder / "decision-rubric.yaml")
    research_contract = read_json(folder / "research-contract.json")
    checks.append(check("ACTIONS", "pass" if actions else "warn", f"{len(actions)} action rows detected."))
    checks.append(check("RISKS", "pass" if risks else "warn", f"{len(risks)} risk rows detected."))
    checks.append(check("CLAIMS", "pass" if claims else "warn", f"{len(claims)} claims detected."))
    checks.append(check("DECISIONS", "pass" if decisions else "warn", f"{len(decisions)} ledger decisions detected."))
    checks.append(
        check(
            "RESEARCH-PROFILE",
            "pass" if (research_profile.get("profile") or {}).get("type") in {"tech", "bench", "market", "product", "mapping"} else "warn",
            f"research-profile.yaml type: {(research_profile.get('profile') or {}).get('type', 'missing')}.",
        )
    )
    checks.append(
        check(
            "DECISION-RUBRIC",
            "pass" if decision_rubric.get("status") in {"applicable", "not_applicable"} else "warn",
            f"decision-rubric.yaml status: {decision_rubric.get('status', 'missing')}.",
        )
    )
    profile_type = (research_profile.get("profile") or {}).get("type")
    dimension_pack = (decision_rubric.get("model") or {}).get("dimension_pack")
    checks.append(
        check(
            "RUBRIC-DIMENSION-PACK",
            "pass" if profile_type == dimension_pack and dimension_pack in {"tech", "bench", "market", "product", "mapping"} else "warn",
            f"decision-rubric.yaml dimension_pack: {dimension_pack or 'missing'}; profile.type: {profile_type or 'missing'}.",
        )
    )
    required_contract_fields = ["research_kind", "objective", "decision_context", "taxonomy", "rubric_model", "evidence_model", "stop_rules"]
    missing_contract_fields = [field for field in required_contract_fields if not research_contract.get(field)]
    checks.append(
        check(
            "RESEARCH-CONTRACT",
            "pass" if research_contract and not missing_contract_fields else "warn",
            "research-contract.json "
            + (
                f"present; kind: {research_contract.get('research_kind', 'missing')}."
                if research_contract and not missing_contract_fields
                else f"missing or incomplete; missing: {', '.join(missing_contract_fields) or 'file'}."
            ),
        )
    )
    checks.append(check("EXECUTION-LOG", "pass" if read_jsonl(folder / "execution-log.jsonl") else "warn", "execution-log.jsonl parsed."))

    status = "pass" if all(item["status"] == "pass" for item in checks) else "warn"
    return {
        "schema_version": "aiox-research-validation-report-v1",
        "research_slug": folder.name,
        "generated_at": today(),
        "derived_from_research": True,
        "status": status,
        "checks": checks,
        "known_limits": [item["message"] for item in checks if item["status"] != "pass"],
    }


def dump_yaml(value: Any) -> str:
    if yaml is None:
        raise RuntimeError("PyYAML is required")
    return yaml.safe_dump(value, allow_unicode=True, sort_keys=False, width=120)


def write_atomic(path: Path, payload: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate dashboard manifest and validation report for research or bench")
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
        sys.stderr.write(f"[dashboard-manifest] mode={mode.value} (folder: {folder.name})\n")

    manifest = build_manifest(folder)
    validation_report = build_validation_report(folder, manifest)
    payloads = {
        "dashboard-manifest.yaml": dump_yaml(manifest),
        "validation-report.yaml": dump_yaml(validation_report),
    }

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
        if stale and not args.quiet:
            sys.stderr.write("stale dashboard artifacts: " + ", ".join(stale) + "\n")
        return 1 if stale else 0

    if not args.quiet:
        print("generated dashboard artifacts: " + ", ".join(payloads))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
