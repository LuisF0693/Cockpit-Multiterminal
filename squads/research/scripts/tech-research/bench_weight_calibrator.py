#!/usr/bin/env python3
"""bench_weight_calibrator.py — Interactive weight calibration BEFORE bench execution.

Origin: Founder directive 2026-05-18:
    "A avaliação deve ser research_depth_synthesis + tool_runtime_integration +
     multi_agent_orchestration inclusive antes da pesquisa ser feita, isso deve
     ser perguntando pro usuário para o bench realmente ser bem calibrado"

Problem solved:
    Pre-EPIC-153, bench weights were either:
    (a) Hardcoded in research-bench-gold contract (SINKRA-fit favorable bias)
    (b) Set by AI without consulting the operator → epistemic dishonesty

This script asks the operator BEFORE scoring axes selection:
    - Which macro groups matter for THIS specific bench?
    - What's the priority distribution (high/medium/low/zero)?
    - Are there mandatory thresholds (gate conditions)?

Output: `bench-weights.yaml` written to bench_dir BEFORE comparison-matrix.json
is built. All downstream scoring scripts MUST read this file as authoritative.

Modes:
    --interactive (default): asks user step-by-step
    --preset {balanced|technical|product|academic|absorption}: skip prompts
    --from-file <path>: load from existing bench-weights.yaml
    --dry-run: show what would be asked without writing

Usage:
    python3 bench_weight_calibrator.py --bench-dir docs/bench/{slug}/
    python3 bench_weight_calibrator.py --bench-dir <dir> --preset technical
    python3 bench_weight_calibrator.py --bench-dir <dir> --preset absorption --quiet

Exit codes:
    0: Weights captured and written
    1: User aborted calibration (no file written)
    3: Argument/environment error
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    sys.stderr.write("ERROR: pyyaml not installed. Install with: pip install pyyaml\n")
    sys.exit(3)


SCRIPT_DIR = Path(__file__).resolve().parent
TAXONOMY_PATH = SCRIPT_DIR.parent.parent / "data" / "bench-microdim-taxonomy.yaml"


# Canonical macro groups (matches bench-microdim-taxonomy.yaml + research-bench-gold.md)
MACRO_GROUPS = [
    {
        "id": "agentic_planning_control",
        "label": "Agentic Planning Control",
        "description": "How the agent decomposes, plans, replans, and recovers from failures",
        "default_weight": 15,
        "examples": ["plan_explicit", "replanning_on_failure", "cost_aware_planning"],
    },
    {
        "id": "tool_runtime_integration",
        "label": "Tool Runtime Integration",
        "description": "Providers/tools/APIs (MCP, browser, PDF, arXiv, PubMed, GitHub)",
        "default_weight": 13,
        "examples": ["mcp_server_native", "browser_automation", "arxiv_api_native"],
    },
    {
        "id": "research_depth_synthesis",
        "label": "Research Depth & Synthesis",
        "description": "Sources count, deep-read, source diversity, summarization quality",
        "default_weight": 13,
        "examples": ["avg_sources_per_run", "deep_read_protocol", "source_diversity"],
    },
    {
        "id": "multi_agent_orchestration",
        "label": "Multi-Agent Orchestration",
        "description": "Sub-agent spawn, role specialization, parallel execution, handoff",
        "default_weight": 10,
        "examples": ["role_specialization", "true_parallel_spawn", "lead_synthesizer"],
    },
    {
        "id": "evidence_fidelity_evaluation",
        "label": "Evidence Fidelity",
        "description": "Citation verify, URL alive check, retraction check, archive snapshot",
        "default_weight": 10,
        "examples": ["citation_verify_loop", "quote_match_exact", "retraction_check"],
    },
    {
        "id": "ux_operator_control",
        "label": "UX Operator Control",
        "description": "Live streaming, interrupt, edit plan mid-execution, cost meter",
        "default_weight": 9,
        "examples": ["live_streaming_output", "interrupt_mid_execution", "cost_meter_live"],
    },
    {
        "id": "architecture_absorption",
        "label": "Architecture Absorption",
        "description": "Codebase reuse readiness, license clean-room, ADR quality",
        "default_weight": 5,
        "examples": ["coverage", "depth", "replay_readiness"],
    },
    {
        "id": "implementation_maturity",
        "label": "Implementation Maturity",
        "description": "Test coverage, CI/CD, error handling, prod deployments",
        "default_weight": 5,
        "examples": ["test_coverage", "ci_cd_presence", "error_handling"],
    },
    {
        "id": "trace_observability",
        "label": "Trace Observability",
        "description": "Event jsonl, span tracking, latency attribution, OTEL native",
        "default_weight": 4,
        "examples": ["event_jsonl", "span_tracking", "latency_attribution"],
    },
    {
        "id": "private_kb_grounding",
        "label": "Private KB Grounding",
        "description": "Vector DB, embedding models, hybrid search, RAG rerank",
        "default_weight": 6,
        "examples": ["vector_db_native", "hybrid_search", "rag_rerank"],
    },
    {
        "id": "evaluation_value",
        "label": "Evaluation Value",
        "description": "Public bench score, eval harness, golden fixtures, regression tests",
        "default_weight": 4,
        "examples": ["public_bench_score", "eval_harness_included", "golden_fixtures"],
    },
    {
        "id": "scientific_pipeline",
        "label": "Scientific Pipeline",
        "description": "Hypothesis, experiment protocol, statistical tests, peer review",
        "default_weight": 3,
        "examples": ["hypothesis_formal", "experiment_protocol", "statistical_test"],
    },
    {
        "id": "training_methodology",
        "label": "Training Methodology",
        "description": "RL pipeline, supervised data, fine-tune recipe, model card",
        "default_weight": 1,
        "examples": ["rl_pipeline", "supervised_data", "model_card_quality"],
    },
    {
        "id": "product_ux_reference",
        "label": "Product UX Reference",
        "description": "Main UI quality, mobile responsive, accessibility, dark mode",
        "default_weight": 1,
        "examples": ["main_ui_quality", "mobile_responsive", "accessibility"],
    },
    {
        "id": "compliance_safety",
        "label": "Compliance Safety",
        "description": "SOC2-ready, GDPR-aware, PII detection, content moderation",
        "default_weight": 1,
        "examples": ["soc2_ready", "gdpr_aware", "pii_detection"],
    },
    # NOTE: 'sinkra_fit' dimension intentionally REMOVED (founder directive 2026-05-18).
    # A bench comparing competitors must NOT include a dimension that measures
    # "alignment with the anchor's own methodology" — that is structural self-favoring.
    # The bench is framework-agnostic. SINKRA-specific evaluation belongs in
    # internal audits, NOT in public benchmark comparisons.
]


# Presets: pre-defined weight profiles for common bench types
PRESETS = {
    "balanced": {g["id"]: g["default_weight"] for g in MACRO_GROUPS},
    "technical": {
        "agentic_planning_control": 18,
        "tool_runtime_integration": 18,
        "research_depth_synthesis": 12,
        "multi_agent_orchestration": 12,
        "evidence_fidelity_evaluation": 10,
        "ux_operator_control": 6,
        "architecture_absorption": 8,
        "implementation_maturity": 8,
        "trace_observability": 4,
        "private_kb_grounding": 2,
        "evaluation_value": 2,
        "scientific_pipeline": 0,
        "training_methodology": 0,
        "product_ux_reference": 0,
        "compliance_safety": 0,
    },
    "product": {
        "agentic_planning_control": 10,
        "tool_runtime_integration": 8,
        "research_depth_synthesis": 8,
        "multi_agent_orchestration": 5,
        "evidence_fidelity_evaluation": 8,
        "ux_operator_control": 20,
        "architecture_absorption": 3,
        "implementation_maturity": 5,
        "trace_observability": 2,
        "private_kb_grounding": 5,
        "evaluation_value": 5,
        "scientific_pipeline": 0,
        "training_methodology": 0,
        "product_ux_reference": 20,
        "compliance_safety": 1,
    },
    "academic": {
        "agentic_planning_control": 10,
        "tool_runtime_integration": 12,
        "research_depth_synthesis": 22,
        "multi_agent_orchestration": 5,
        "evidence_fidelity_evaluation": 22,
        "ux_operator_control": 3,
        "architecture_absorption": 2,
        "implementation_maturity": 3,
        "trace_observability": 3,
        "private_kb_grounding": 5,
        "evaluation_value": 3,
        "scientific_pipeline": 10,
        "training_methodology": 0,
        "product_ux_reference": 0,
        "compliance_safety": 0,
    },
    "absorption": {
        # Historical compat: original "deepresearch-absorption-benchmark" weights MINUS sinkra_fit.
        # sinkra_fit removed 2026-05-18 per founder directive — bench must be framework-agnostic.
        "agentic_planning_control": 15,
        "tool_runtime_integration": 13,
        "research_depth_synthesis": 13,
        "multi_agent_orchestration": 10,
        "evidence_fidelity_evaluation": 10,
        "ux_operator_control": 9,
        "architecture_absorption": 5,
        "implementation_maturity": 5,
        "trace_observability": 4,
        "private_kb_grounding": 6,
        "evaluation_value": 4,
        "scientific_pipeline": 3,
        "training_methodology": 1,
        "product_ux_reference": 1,
        "compliance_safety": 1,
    },
}


def print_groups_table(weights: dict[str, int]) -> None:
    """Print formatted table of weights."""
    print()
    print(f"  {'ID':<32} {'Label':<32} {'Weight':>6}")
    print(f"  {'-' * 32} {'-' * 32} {'-' * 6}")
    total = 0
    for g in MACRO_GROUPS:
        w = weights.get(g["id"], 0)
        total += w
        print(f"  {g['id']:<32} {g['label']:<32} {w:>5}")
    print(f"  {'-' * 32} {'-' * 32} {'-' * 6}")
    print(f"  {'TOTAL':<32} {'':<32} {total:>5} (target: 100)")
    print()


def prompt_int(question: str, default: int, min_val: int = 0, max_val: int = 50) -> int:
    """Prompt for integer with default. Returns default if user hits enter."""
    suffix = f" [default {default}, range {min_val}-{max_val}]"
    while True:
        try:
            response = input(f"  {question}{suffix}: ").strip()
        except EOFError:
            return default
        if not response:
            return default
        try:
            value = int(response)
            if min_val <= value <= max_val:
                return value
            print(f"    Out of range. Must be {min_val}-{max_val}.")
        except ValueError:
            print(f"    Invalid integer.")


def prompt_yesno(question: str, default: bool = True) -> bool:
    """Prompt yes/no with default."""
    suffix = " [Y/n]" if default else " [y/N]"
    try:
        response = input(f"  {question}{suffix}: ").strip().lower()
    except EOFError:
        return default
    if not response:
        return default
    return response in ("y", "yes", "s", "sim")


def interactive_calibration(slug: str) -> dict[str, int]:
    """Walk operator through weight calibration interactively."""
    print()
    print("=" * 72)
    print(f"  Bench Weight Calibration — {slug}")
    print("=" * 72)
    print()
    print("  Calibration captures YOUR priorities for THIS bench BEFORE scoring.")
    print("  Total weights must sum to 100 (script will normalize at the end).")
    print()
    print("  Tip: use 0 to exclude a group from the bench entirely.")
    print()

    print("  Step 1/3 — Choose starting preset (or 'custom' for blank slate):")
    print("    [1] balanced  — default weights from microdim-taxonomy.yaml")
    print("    [2] technical — agentic/tool/multi-agent heavy (default for tech bench)")
    print("    [3] product   — UX/UI/product-focused")
    print("    [4] academic  — depth + evidence fidelity heavy")
    print("    [5] absorption — original deepresearch-absorption-benchmark weights")
    print("    [6] custom    — start from zero, set each manually")
    print()
    preset_map = {"1": "balanced", "2": "technical", "3": "product", "4": "academic", "5": "absorption", "6": "custom"}
    while True:
        try:
            choice = input("  Choose [1-6, default 2]: ").strip() or "2"
        except EOFError:
            choice = "2"
        if choice in preset_map:
            break
        print("    Invalid choice.")

    preset_name = preset_map[choice]
    if preset_name == "custom":
        weights = {g["id"]: 0 for g in MACRO_GROUPS}
    else:
        weights = dict(PRESETS[preset_name])

    print()
    print(f"  Starting from preset: {preset_name}")
    print_groups_table(weights)

    print("  Step 2/3 — Adjust weights for the 3 CRITICAL groups (founder mandate):")
    print()
    critical_groups = ["research_depth_synthesis", "tool_runtime_integration", "multi_agent_orchestration"]
    for gid in critical_groups:
        g = next(x for x in MACRO_GROUPS if x["id"] == gid)
        print(f"  [{g['label']}]")
        print(f"    Why it matters: {g['description']}")
        print(f"    Examples: {', '.join(g['examples'][:3])}")
        weights[gid] = prompt_int(f"  Weight for {g['label']}", weights[gid])
        print()

    print("  Step 3/3 — Review and adjust other groups (press Enter to keep value):")
    print()
    for g in MACRO_GROUPS:
        if g["id"] in critical_groups:
            continue
        current = weights[g["id"]]
        print(f"  [{g['label']}] — {g['description'][:60]}...")
        weights[g["id"]] = prompt_int(f"  Weight for {g['label']}", current)

    print()
    print("=" * 72)
    print("  Final weights:")
    print_groups_table(weights)

    if not prompt_yesno("  Accept these weights?", default=True):
        print("  Calibration aborted by user.")
        return None

    return weights


def normalize_weights(weights: dict[str, int]) -> dict[str, float]:
    """Normalize weights to sum exactly 100.0."""
    total = sum(weights.values())
    if total == 0:
        return weights  # all zeros — caller should reject
    return {k: round(v * 100.0 / total, 2) for k, v in weights.items()}


def build_weights_yaml(slug: str, weights: dict, raw_weights: dict, preset_used: str | None, taxonomy_version: str) -> dict:
    """Build the bench-weights.yaml payload."""
    return {
        "schema_version": "bench-weights.v1",
        "_doc": "Operator-calibrated weights for this specific bench. AUTHORITATIVE — overrides defaults.",
        "bench_slug": slug,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "taxonomy_reference": {
            "path": "squads/research/data/bench-microdim-taxonomy.yaml",
            "version": taxonomy_version,
        },
        "calibration_method": "interactive" if preset_used is None else f"preset:{preset_used}",
        "preset_used": preset_used,
        "raw_weights": raw_weights,
        "normalized_weights": weights,
        "total_normalized": sum(weights.values()),
        "excluded_groups": [k for k, v in raw_weights.items() if v == 0],
        "critical_groups_acknowledged": [
            "research_depth_synthesis",
            "tool_runtime_integration",
            "multi_agent_orchestration",
        ],
        "validation": {
            "founder_mandate": "research_depth_synthesis + tool_runtime_integration + multi_agent_orchestration must be acknowledged before bench execution",
            "weights_normalized": True,
            "framework_agnostic": True,
            "sinkra_fit_removed": "Removed 2026-05-18 per founder directive — anchor-favoring dimension violates framework-agnostic benchmarking",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--bench-dir", required=True, type=Path, help="Path to docs/bench/{slug}/")
    parser.add_argument("--preset", choices=list(PRESETS.keys()), help="Skip interactive prompts, use named preset")
    parser.add_argument("--from-file", type=Path, help="Load weights from existing bench-weights.yaml")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be asked without writing")
    parser.add_argument("--quiet", action="store_true", help="Suppress final table print")
    args = parser.parse_args()

    bench_dir = args.bench_dir.resolve()
    if not bench_dir.is_dir():
        sys.stderr.write(f"ERROR: bench-dir not found: {bench_dir}\n")
        return 3
    slug = bench_dir.name

    # Load taxonomy version for traceability
    taxonomy_version = "?"
    if TAXONOMY_PATH.exists():
        try:
            with TAXONOMY_PATH.open("r", encoding="utf-8") as f:
                tax = yaml.safe_load(f)
                taxonomy_version = tax.get("version", "?")
        except Exception:
            pass

    # Resolve weights via one of 3 paths
    preset_used = None
    raw_weights: dict[str, int]

    if args.from_file:
        with args.from_file.open("r", encoding="utf-8") as f:
            existing = yaml.safe_load(f)
        raw_weights = existing.get("raw_weights", {g["id"]: g["default_weight"] for g in MACRO_GROUPS})
        preset_used = existing.get("preset_used")
        sys.stderr.write(f"Loaded weights from {args.from_file}\n")
    elif args.preset:
        raw_weights = dict(PRESETS[args.preset])
        preset_used = args.preset
        sys.stderr.write(f"Using preset: {args.preset}\n")
    else:
        result = interactive_calibration(slug)
        if result is None:
            return 1
        raw_weights = result

    if args.dry_run:
        sys.stderr.write("DRY-RUN: would write weights but not persisting.\n")
        if not args.quiet:
            print_groups_table(raw_weights)
        return 0

    # Normalize and persist
    normalized = normalize_weights(raw_weights)
    payload = build_weights_yaml(slug, normalized, raw_weights, preset_used, taxonomy_version)

    out_path = bench_dir / "bench-weights.yaml"
    with out_path.open("w", encoding="utf-8") as f:
        yaml.dump(payload, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)

    if not args.quiet:
        print(f"✓ Weights written to {out_path}")
        print(f"   Preset: {preset_used or 'interactive'}")
        print(f"   Critical groups: research_depth={raw_weights.get('research_depth_synthesis')}, "
              f"tool_runtime={raw_weights.get('tool_runtime_integration')}, "
              f"multi_agent={raw_weights.get('multi_agent_orchestration')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
