#!/usr/bin/env python3
"""research_graph.py — derives a machine-readable DAG from a research folder.

Inspired by btahir/open-deep-research "Visual Research Mapping" Flow feature
(see docs/research/2026-05-11-visual-deep-research-apps/02-research-report.md §1.1).
We persist the graph as JSON on the filesystem instead of in-app drag-and-drop UI.

Node types and conventions
--------------------------
- root:           the research folder itself
- query:          00-query-original.md
- prompt:         01-deep-research-prompt.md
- report:         02-research-report.md
- recommendations:03-recommendations.md
- followup:       04-*.md, 05-*.md, ..., 99-*.md (any NN-<slug>.md with NN >= 04)
- wave:           wave-N-summary.md
- quick_wins:     quick-wins.md
- evolving:       evolving_report.md
- curiosity:      curiosity_queue.yaml
- log:            execution-log.jsonl
- metrics:        metrics.yaml
- pipeline_state: pipeline-state.yaml

Edge relations
--------------
- contains:   root -> any child file node
- produces:   query -> prompt -> report -> recommendations (canonical chain)
- spawns_followup: report -> followup_NN
- checkpoint: wave_N -> report
- derives:    metrics -> report  (and  pipeline_state -> root)

Usage
-----
  python3 squads/research/scripts/tech-research/research_graph.py <output_dir>
  python3 squads/research/scripts/tech-research/research_graph.py <output_dir> --check

Exit codes
----------
  0 = research-graph.json written (or already current with --check)
  1 = --check and graph is stale
  2 = invalid input / missing folder
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import yaml

FOLLOWUP_RE = re.compile(r"^(\d{2})-([a-z0-9][a-z0-9-]*)\.md$")
WAVE_RE = re.compile(r"^wave-(\d+)-summary\.md$")

CANONICAL_FILES = {
    "00-query-original.md": ("query", "00-query"),
    "01-deep-research-prompt.md": ("prompt", "01-prompt"),
    "02-research-report.md": ("report", "02-report"),
    "03-recommendations.md": ("recommendations", "03-recommendations"),
    "quick-wins.md": ("quick_wins", "quick-wins"),
    "evolving_report.md": ("evolving", "evolving"),
    "curiosity_queue.yaml": ("curiosity", "curiosity"),
    "execution-log.jsonl": ("log", "log"),
    "metrics.yaml": ("metrics", "metrics"),
    "pipeline-state.yaml": ("pipeline_state", "pipeline-state"),
    "README.md": ("readme", "readme"),
}


def _read_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError):
        return {}
    return data if isinstance(data, dict) else {}


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _short(value: Any, limit: int = 160) -> str:
    text = str(value or "").replace("\n", " ").strip()
    text = re.sub(r"\s+", " ", text)
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _file_ref(value: Any) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    match = re.search(r"([A-Za-z0-9][A-Za-z0-9._-]+\.(?:md|ya?ml|jsonl?|txt))", text)
    return match.group(1) if match else None


def _node_ref_from_evidence(value: Any, file_nodes: dict[str, str], player_nodes: dict[str, str], source_nodes: dict[str, str]) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    player_match = re.search(r"players\.yaml\s+(player-\d+)", text, re.IGNORECASE)
    if player_match:
        return player_nodes.get(player_match.group(1))
    source_match = re.search(r"sources\.yaml\s+(src-\d+)", text, re.IGNORECASE)
    if source_match:
        return source_nodes.get(source_match.group(1))
    file_ref = _file_ref(text)
    if file_ref:
        return file_nodes.get(file_ref)
    return None


def _stat(path: Path) -> dict[str, Any]:
    try:
        st = path.stat()
    except OSError:
        return {}
    return {
        "size_bytes": st.st_size,
        "exists": True,
    }


def _derive_confidence(folder: Path) -> str:
    """Derive confidence level from metrics.yaml coverage_score if available."""
    metrics_path = folder / "metrics.yaml"
    if not metrics_path.exists():
        return "medium"
    try:
        data = _read_yaml(metrics_path)
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


def _collect_evidence_refs(folder: Path) -> list[str]:
    """Collect the evidence input files used to build this graph."""
    refs: list[str] = []
    for name in ["sources.yaml", "players.yaml", "claims.yaml", "decision-ledger.yaml",
                 "action-plan.yaml", "risk-register.yaml", "curiosity_queue.yaml"]:
        if (folder / name).exists():
            refs.append(name)
    for name in sorted(f.name for f in folder.glob("[0-9][0-9]-*.md")):
        refs.append(name)
    return refs


def build_graph(folder: Path) -> dict[str, Any]:
    slug = folder.name
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    node_ids: set[str] = set()
    edge_keys: set[tuple[str, str, str]] = set()

    def add_node(node: dict[str, Any]) -> str:
        node_id = str(node["id"])
        if node_id in node_ids:
            return node_id
        node_ids.add(node_id)
        nodes.append(node)
        return node_id

    def add_edge(source: str | None, target: str | None, relation: str, **attrs: Any) -> None:
        if not source or not target or source == target:
            return
        key = (source, target, relation)
        if key in edge_keys:
            return
        edge_keys.add(key)
        edges.append({"from": source, "to": target, "relation": relation, **{k: v for k, v in attrs.items() if v not in (None, "", [], {})}})

    root_id = "root"
    add_node({"id": root_id, "type": "root", "label": slug, "slug": slug, "path": "."})

    canonical_ids_present: dict[str, str] = {}  # type -> id
    file_nodes: dict[str, str] = {}
    for filename in sorted(folder.iterdir()):
        if not filename.is_file():
            continue
        name = filename.name

        if name in CANONICAL_FILES:
            ntype, nid = CANONICAL_FILES[name]
            node = {"id": nid, "type": ntype, "label": name, "file": name, **_stat(filename)}
            add_node(node)
            add_edge(root_id, nid, "contains")
            canonical_ids_present[ntype] = nid
            file_nodes[name] = nid
            continue

        wave_match = WAVE_RE.match(name)
        if wave_match:
            n = int(wave_match.group(1))
            nid = f"wave-{n}"
            add_node({"id": nid, "type": "wave", "label": f"Wave {n}", "file": name, "wave_number": n, **_stat(filename)})
            add_edge(root_id, nid, "contains")
            file_nodes[name] = nid
            continue

        followup_match = FOLLOWUP_RE.match(name)
        if followup_match:
            nn = int(followup_match.group(1))
            if nn >= 4:
                slug_part = followup_match.group(2)
                nid = f"{followup_match.group(1)}-{slug_part}"
                add_node(
                    {
                        "id": nid,
                        "type": "followup",
                        "label": name,
                        "file": name,
                        "followup_number": nn,
                        **_stat(filename),
                    }
                )
                add_edge(root_id, nid, "contains")
                file_nodes[name] = nid
            continue

        if re.search(r"\.(?:md|ya?ml|jsonl?|txt)$", name):
            safe_id = "artifact-" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            ftype = "graph" if name == "research-graph.json" else "artifact"
            self_stat = {} if name == "research-graph.json" else _stat(filename)
            add_node({"id": safe_id, "type": ftype, "label": name, "file": name, **self_stat})
            add_edge(root_id, safe_id, "contains")
            file_nodes[name] = safe_id
            continue

    # Canonical production chain: query -> prompt -> report -> recommendations
    chain = ["query", "prompt", "report", "recommendations"]
    for i in range(len(chain) - 1):
        a, b = chain[i], chain[i + 1]
        if a in canonical_ids_present and b in canonical_ids_present:
            add_edge(canonical_ids_present[a], canonical_ids_present[b], "produces")

    # Waves checkpoint into report
    if "report" in canonical_ids_present:
        for node in nodes:
            if node.get("type") == "wave":
                add_edge(str(node["id"]), canonical_ids_present["report"], "checkpoint")

    # Report spawns each followup
    if "report" in canonical_ids_present:
        for node in nodes:
            if node.get("type") == "followup":
                add_edge(canonical_ids_present["report"], str(node["id"]), "spawns_followup")

    # Metrics derives report quality; pipeline_state describes root
    if "metrics" in canonical_ids_present and "report" in canonical_ids_present:
        add_edge(canonical_ids_present["metrics"], canonical_ids_present["report"], "derives")
    if "pipeline_state" in canonical_ids_present:
        add_edge(canonical_ids_present["pipeline_state"], root_id, "describes")

    report_id = canonical_ids_present.get("report")
    recommendations_id = canonical_ids_present.get("recommendations")

    sources = _read_yaml(folder / "sources.yaml").get("sources")
    source_nodes: dict[str, str] = {}
    source_url_nodes: dict[str, str] = {}
    if isinstance(sources, list):
        for source in sources:
            if not isinstance(source, dict):
                continue
            sid = str(source.get("id") or "").strip()
            if not sid:
                continue
            nid = f"source-{sid}"
            source_nodes[sid] = nid
            url = str(source.get("url") or "").strip()
            if url:
                source_url_nodes[url] = nid
            add_node(
                {
                    "id": nid,
                    "type": "source",
                    "label": _short(source.get("title") or sid, 80),
                    "source_id": sid,
                    "credibility": source.get("credibility"),
                    "url": url or None,
                    "date": source.get("date"),
                    "evidence": source.get("first_seen_in"),
                }
            )
            add_edge(file_nodes.get("sources.yaml"), nid, "indexes")
            add_edge(nid, file_nodes.get(str(source.get("first_seen_in") or "")), "cited_in")
            add_edge(nid, report_id, "supports")

    players = _read_yaml(folder / "players.yaml").get("players")
    player_nodes: dict[str, str] = {}
    if isinstance(players, list):
        for player in players:
            if not isinstance(player, dict):
                continue
            pid = str(player.get("id") or "").strip()
            if not pid:
                continue
            nid = f"player-{pid}"
            player_nodes[pid] = nid
            add_node(
                {
                    "id": nid,
                    "type": "player",
                    "label": player.get("name"),
                    "tier": player.get("tier"),
                    "category": player.get("category"),
                    "role": player.get("role"),
                    "fit": player.get("fit"),
                    "action": player.get("action"),
                    "evidence": player.get("first_seen_in"),
                }
            )
            add_edge(file_nodes.get("players.yaml"), nid, "indexes")
            add_edge(nid, report_id, "analyzed_in")
            source_url = str(player.get("source_url") or "").strip()
            add_edge(source_url_nodes.get(source_url), nid, "documents")

    claims = _read_yaml(folder / "claims.yaml").get("claims")
    if isinstance(claims, list):
        for claim in claims:
            if not isinstance(claim, dict):
                continue
            cid = str(claim.get("id") or "").strip()
            if not cid:
                continue
            nid = f"claim-{cid}"
            add_node(
                {
                    "id": nid,
                    "type": "claim",
                    "label": _short(claim.get("claim"), 96),
                    "confidence": claim.get("confidence"),
                    "summary": claim.get("implication"),
                }
            )
            add_edge(file_nodes.get("claims.yaml"), nid, "indexes")
            add_edge(nid, recommendations_id, "informs")
            evidence = claim.get("evidence")
            if isinstance(evidence, list):
                for item in evidence:
                    add_edge(_node_ref_from_evidence(item, file_nodes, player_nodes, source_nodes), nid, "supports")

    decisions = _read_yaml(folder / "decision-ledger.yaml").get("decisions")
    decision_nodes: dict[str, str] = {}
    if isinstance(decisions, list):
        for decision in decisions:
            if not isinstance(decision, dict):
                continue
            did = str(decision.get("id") or "").strip()
            if not did:
                continue
            nid = f"decision-{did}"
            decision_nodes[did] = nid
            add_node(
                {
                    "id": nid,
                    "type": "decision",
                    "label": _short(decision.get("decision"), 96),
                    "status": decision.get("status"),
                    "confidence": decision.get("confidence"),
                    "summary": decision.get("consequence"),
                }
            )
            add_edge(file_nodes.get("decision-ledger.yaml"), nid, "indexes")
            add_edge(nid, recommendations_id, "drives")
            evidence = decision.get("evidence")
            if isinstance(evidence, list):
                for item in evidence:
                    add_edge(_node_ref_from_evidence(item, file_nodes, player_nodes, source_nodes), nid, "supports")

    action_plan = _read_yaml(folder / "action-plan.yaml")
    action_decision = action_plan.get("decision") if isinstance(action_plan.get("decision"), dict) else {}
    if isinstance(action_decision, dict) and action_decision.get("id"):
        nid = f"decision-action-plan-{action_decision.get('id')}"
        add_node(
            {
                "id": nid,
                "type": "decision",
                "label": action_decision.get("title"),
                "status": action_decision.get("recommendation"),
                "confidence": action_decision.get("confidence"),
                "summary": action_decision.get("summary"),
            }
        )
        add_edge(file_nodes.get("action-plan.yaml"), nid, "declares")
        add_edge(nid, recommendations_id, "drives")
        for item in action_decision.get("evidence") or []:
            add_edge(_node_ref_from_evidence(item, file_nodes, player_nodes, source_nodes), nid, "supports")

    actions = action_plan.get("actions")
    action_nodes: dict[str, str] = {}
    if isinstance(actions, list):
        for action in actions:
            if not isinstance(action, dict):
                continue
            aid = str(action.get("id") or "").strip()
            if not aid:
                continue
            nid = f"action-{aid}"
            action_nodes[aid] = nid
            add_node(
                {
                    "id": nid,
                    "type": "action",
                    "label": action.get("title"),
                    "priority": action.get("priority"),
                    "effort": action.get("effort"),
                    "owner": action.get("owner_hint"),
                    "status": action.get("status"),
                    "evidence": action.get("evidence"),
                }
            )
            add_edge(file_nodes.get("action-plan.yaml"), nid, "indexes")
            add_edge(recommendations_id, nid, "recommends")
            add_edge(_node_ref_from_evidence(action.get("evidence"), file_nodes, player_nodes, source_nodes), nid, "supports")

    risks = _read_yaml(folder / "risk-register.yaml").get("risks")
    if isinstance(risks, list):
        for risk in risks:
            if not isinstance(risk, dict):
                continue
            rid = str(risk.get("id") or "").strip()
            if not rid:
                continue
            nid = f"risk-{rid}"
            add_node(
                {
                    "id": nid,
                    "type": "risk",
                    "label": _short(risk.get("risk"), 96),
                    "severity": risk.get("severity"),
                    "probability": risk.get("probability"),
                    "owner": risk.get("owner_hint"),
                    "summary": risk.get("mitigation"),
                }
            )
            add_edge(file_nodes.get("risk-register.yaml"), nid, "indexes")
            add_edge(nid, recommendations_id, "constrains")

    curiosity = _read_yaml(folder / "curiosity_queue.yaml")
    questions = curiosity.get("questions") or curiosity.get("items")
    if isinstance(questions, list):
        for question in questions:
            if not isinstance(question, dict):
                continue
            qid = str(question.get("id") or "").strip()
            if not qid:
                continue
            nid = f"question-{qid}"
            add_node(
                {
                    "id": nid,
                    "type": "question",
                    "label": _short(question.get("question"), 96),
                    "priority": question.get("priority"),
                    "category": question.get("category"),
                    "status": question.get("status"),
                    "summary": question.get("next_action"),
                }
            )
            add_edge(file_nodes.get("curiosity_queue.yaml"), nid, "indexes")
            add_edge(nid, recommendations_id, "open_item")
            add_edge(_node_ref_from_evidence(question.get("evidence"), file_nodes, player_nodes, source_nodes), nid, "raises")

    node_type_counts: dict[str, int] = {}
    for node in nodes:
        ntype = str(node.get("type") or "unknown")
        node_type_counts[ntype] = node_type_counts.get(ntype, 0) + 1

    links = [
        {"source": edge["from"], "target": edge["to"], "relation": edge["relation"]}
        for edge in edges
    ]

    selected_decisions = [
        node["id"]
        for node in nodes
        if node.get("type") == "decision" and str(node.get("status", "")).lower() in {"selected", "build"}
    ]

    confidence = _derive_confidence(folder)
    evidence_refs = _collect_evidence_refs(folder)

    return {
        "schema_version": "2.0",
        "generator": "tech-research/research_graph.py",
        "slug": slug,
        "root_id": root_id,
        "derived_from_research": True,
        "evidence_refs": evidence_refs,
        "confidence": confidence,
        "limitations": [
            "graph topology derived from filesystem artifacts — nodes missing if extractor scripts were not run",
            "edge relations are structural (contains/produces/supports); semantic weight not computed",
            "player and source cross-links depend on players.yaml and sources.yaml being present and current",
        ],
        "nodes": nodes,
        "edges": edges,
        "links": links,
        "node_count": len(nodes),
        "edge_count": len(edges),
        "node_type_counts": dict(sorted(node_type_counts.items())),
        "decision": {
            "selected_nodes": selected_decisions,
            "confidence": "high" if selected_decisions else None,
        },
    }


def write_atomic(target: Path, payload: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, target)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build research-graph.json from a research or bench folder")
    parser.add_argument("folder", help="Path to docs/research/{date}-{slug}/ or docs/bench/{date}-{slug}/")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit 1 if current research-graph.json differs from generated content",
    )
    parser.add_argument("--quiet", action="store_true", help="Suppress stdout summary")
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
        sys.stderr.write(f"[research-graph] mode={mode.value} (folder: {folder.name})\n")

    graph = build_graph(folder)
    payload = json.dumps(graph, indent=2, sort_keys=True, ensure_ascii=False) + "\n"

    target = folder / "research-graph.json"
    if args.check:
        if not target.exists():
            sys.stderr.write(f"check failed: {target} missing (run without --check to generate)\n")
            return 1
        if target.read_text(encoding="utf-8") != payload:
            sys.stderr.write(f"check failed: {target} is stale\n")
            return 1
        if not args.quiet:
            print(f"[research-graph] up-to-date: {graph['node_count']} nodes, {graph['edge_count']} edges")
        return 0

    write_atomic(target, payload)
    if not args.quiet:
        print(
            f"[research-graph] wrote {target} ({graph['node_count']} nodes, {graph['edge_count']} edges)"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
