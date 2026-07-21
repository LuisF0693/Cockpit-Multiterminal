#!/usr/bin/env python3
"""Pipeline metrics collection and state persistence.

Worker atoms: atm_compute_metrics, atm_save_state
Deterministic: aggregation + file I/O, no LLM needed.

Usage:
    echo '{"start_time":"...","end_time":"...","sources":[],...}' | python metrics_collector.py compute
    echo '{"pipeline_id":"...","state":{...}}' | python metrics_collector.py save --dir /path/to/output
"""

import sys
import json
import os
from datetime import datetime

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# QF-6 — Stop reason enum.
# Allowed codes for the `stop_reason.code` field. Free-form strings still
# accepted in the legacy shape (string instead of dict) for backwards
# compatibility — they round-trip through `normalize_stop_reason` below.
STOP_REASON_CODES = {
    "COVERAGE_THRESHOLD_MET",     # coverage_score reached configured target
    "DIMINISHING_RETURNS",        # new_info_ratio fell below threshold
    "MAX_WAVES",                  # wave budget exhausted
    "USER_HALT",                  # user requested stop
    "TIME_BUDGET",                # session/elapsed budget exhausted
    "VETO_TRIGGERED",             # guardrail veto (e.g. no results)
    "INSUFFICIENT_COVERAGE",      # halted with explicit warning, coverage < 50%
    "AUTHORITY_HANDOFF",          # research sufficient, downstream owner takes over
    "FOLLOWUP_INVITED",           # research closed but curiosity_queue carries follow-ups
    "OTHER",                      # explicitly unclassified; detail must be present
}


def normalize_stop_reason(value) -> dict | None:
    """Coerce a stop_reason value to the structured shape.

    Accepted inputs:
      - None                               → None
      - dict with at least `code` or `detail` → validated and returned
      - str (legacy free-form prose)       → wrapped as {code: OTHER, detail: <str>}

    The result is always either None or a dict with keys
    {code, detail, waves_used, waves_budgeted}. Unknown codes are mapped to
    OTHER and the original code is preserved under `original_code` for
    forensics.
    """
    if value is None or value == "":
        return None
    if isinstance(value, str):
        return {
            "code": "OTHER",
            "detail": value.strip(),
            "waves_used": None,
            "waves_budgeted": None,
        }
    if isinstance(value, dict):
        code = (value.get("code") or "OTHER").strip().upper()
        out = {
            "code": code if code in STOP_REASON_CODES else "OTHER",
            "detail": (value.get("detail") or value.get("reason") or "").strip() or None,
            "waves_used": value.get("waves_used"),
            "waves_budgeted": value.get("waves_budgeted"),
        }
        if code not in STOP_REASON_CODES:
            out["original_code"] = code
        return out
    return None


def compute_metrics(data: dict) -> dict:
    """Compute pipeline execution metrics."""
    start = data.get("start_time")
    end = data.get("end_time")

    duration_seconds = None
    if start and end:
        try:
            t_start = datetime.fromisoformat(start)
            t_end = datetime.fromisoformat(end)
            duration_seconds = round((t_end - t_start).total_seconds(), 1)
        except (ValueError, TypeError):
            pass

    sources = data.get("sources", [])
    high = sum(1 for s in sources if s.get("credibility") == "HIGH")
    medium = sum(1 for s in sources if s.get("credibility") == "MEDIUM")
    low = sum(1 for s in sources if s.get("credibility") == "LOW")
    with_dates = sum(1 for s in sources if s.get("pub_date") and s.get("pub_date") != "date_unknown")
    total = len(sources)
    freshness_ratio = round(with_dates / max(total, 1) * 100, 1)

    return {
        "pipeline_id": data.get("pipeline_id", "unknown"),
        "workflow_version": data.get("workflow_version", "unknown"),
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "duration_seconds": duration_seconds,
        "coverage_score": data.get("coverage_score"),
        "coverage_breakdown": data.get("coverage_breakdown", {}),
        "runtime_contract": data.get("runtime_contract", {
            "workflow_version": data.get("workflow_version", "unknown"),
            "schema_version": data.get("schema_version", "research-output.v2"),
            "skill_version": data.get("skill_version", "unknown"),
            "tool_contract_version": data.get("tool_contract_version", "manual"),
        }),
        "integrity_score": data.get("integrity_score"),
        "citation_verified": data.get("citation_verified", data.get("citation_verified_status")),
        "stop_reason": normalize_stop_reason(data.get("stop_reason")),
        "rubrics": data.get("rubrics", {}),
        "validator_result": data.get("validator_result"),
        "model_tier": data.get("model_tier"),
        "tool_calls": data.get("tool_calls", {}),
        "waves": data.get("waves", 1),
        "sources": {
            "total": total,
            "high_credibility": high,
            "medium_credibility": medium,
            "low_credibility": low,
            "with_dates": with_dates,
            "freshness_ratio": freshness_ratio,
        },
        "claims": data.get("claims", {}),
    }


def save_state(state: dict, output_dir: str) -> dict:
    """Save pipeline state and metrics to files."""
    os.makedirs(output_dir, exist_ok=True)

    metrics_path = os.path.join(output_dir, "metrics.yaml")
    state_path = os.path.join(output_dir, "pipeline-state.yaml")

    metrics = state.get("metrics", state)
    pipeline_state = state.get("state", {
        "pipeline_id": state.get("pipeline_id", "unknown"),
        "status": "completed",
        "current_organism": "org_documentation",
        "wave_number": state.get("waves", 1),
        "coverage_score": state.get("coverage_score"),
        "workflow_version": state.get("workflow_version", "unknown"),
        "runtime_contract": state.get("runtime_contract", {
            "workflow_version": state.get("workflow_version", "unknown"),
            "schema_version": state.get("schema_version", "research-output.v2"),
            "skill_version": state.get("skill_version", "unknown"),
            "tool_contract_version": state.get("tool_contract_version", "manual"),
        }),
        "citation_verified": state.get("citation_verified", state.get("citation_verified_status")),
        "stop_reason": normalize_stop_reason(state.get("stop_reason")),
        "rubrics": state.get("rubrics", {}),
        "artifacts": state.get("artifacts", []),
        "completed_at": datetime.now().isoformat(),
    })

    if HAS_YAML:
        with open(metrics_path, "w") as f:
            yaml.dump(metrics, f, default_flow_style=False, allow_unicode=True)
        with open(state_path, "w") as f:
            yaml.dump(pipeline_state, f, default_flow_style=False, allow_unicode=True)
    else:
        with open(metrics_path, "w") as f:
            json.dump(metrics, f, indent=2)
        with open(state_path, "w") as f:
            json.dump(pipeline_state, f, indent=2)

    return {
        "metrics_file": metrics_path,
        "state_file": state_path,
        "format": "yaml" if HAS_YAML else "json",
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: metrics_collector.py <compute|save> [--dir <path>]", file=sys.stderr)
        sys.exit(1)

    command = sys.argv[1]

    if command == "compute":
        data = json.loads(sys.stdin.read())
        result = compute_metrics(data)
        print(json.dumps(result, indent=2))

    elif command == "save":
        output_dir = "."
        if "--dir" in sys.argv:
            dir_idx = sys.argv.index("--dir") + 1
            output_dir = sys.argv[dir_idx]

        data = json.loads(sys.stdin.read())
        result = save_state(data, output_dir)
        print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
