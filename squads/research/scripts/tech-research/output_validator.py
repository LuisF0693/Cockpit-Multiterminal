#!/usr/bin/env python3
"""Output structure validator for tech-research pipeline.

Worker atom: QG-PROD-6 (output completeness)
Deterministic: file existence + content checks, no LLM needed.

Usage:
    python output_validator.py [--mode current|target] /path/to/docs/research/2026-03-28-slug/

Modes (Sprint 0 A2 fix — REQUIRED_FILES paradox):
    current  Default. Baseline V1 artifacts that every Claude Code + Codex run
             must produce. Aligns with E07 gold standard (docs/research/
             2026-05-06-harness-repositories-apr-may-2026/).
    target   Aspirational V3 artifacts including curiosity_queue, evolving_report,
             and execution-log JSONL. Used by spy v5 evolution + future skill
             upgrades. Currently only E07 partially satisfies; Claude Code runs
             intentionally fail under target until the cognitive atoms ship.
"""

import argparse
import os
import sys
import json
import re

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

REQUIRED_FILES_CURRENT = [
    "README.md",
    "00-query-original.md",
    "01-deep-research-prompt.md",
    "02-research-report.md",
    "03-recommendations.md",
    "quick-wins.md",
    "metrics.yaml",
    "pipeline-state.yaml",
]

REQUIRED_FILES_TARGET = REQUIRED_FILES_CURRENT + [
    "curiosity_queue.yaml",
    "evolving_report.md",
    "execution-log.jsonl",
]

# Default for backward compatibility when callers do not pass --mode.
REQUIRED_FILES = REQUIRED_FILES_CURRENT

OPTIONAL_FILES = []

README_REQUIRED_SECTIONS = [
    "TL;DR",
    "Research Metadata",
    "workflow_version",
    "runtime_contract",
    "coverage_score",
    "citation_verified",
    "stop_reason",
    "rubrics",
]

REPORT_MIN_SIZE = 500
RECS_MIN_SIZE = 200


def _load_structured_file(path: str) -> dict:
    """Load YAML or JSON file content."""
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    if path.endswith(".json") or not HAS_YAML:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    try:
        data = yaml.safe_load(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def validate_output(output_dir: str) -> dict:
    """Validate research output directory structure and content."""
    results = {
        "directory": output_dir,
        "valid": True,
        "checks": [],
        "warnings": [],
        "errors": [],
    }

    if not os.path.isdir(output_dir):
        results["valid"] = False
        results["errors"].append(f"Directory not found: {output_dir}")
        return results

    for f in REQUIRED_FILES:
        path = os.path.join(output_dir, f)
        if os.path.exists(path):
            size = os.path.getsize(path)
            results["checks"].append({"file": f, "status": "EXISTS", "size": size})

            if f == "02-research-report.md" and size < REPORT_MIN_SIZE:
                results["warnings"].append(f"{f} is small ({size} bytes, min {REPORT_MIN_SIZE})")
            if f == "03-recommendations.md" and size < RECS_MIN_SIZE:
                results["warnings"].append(f"{f} is small ({size} bytes, min {RECS_MIN_SIZE})")
        else:
            results["valid"] = False
            results["errors"].append(f"MISSING required file: {f}")
            results["checks"].append({"file": f, "status": "MISSING"})

    for f in OPTIONAL_FILES:
        path = os.path.join(output_dir, f)
        if os.path.exists(path):
            results["checks"].append({"file": f, "status": "EXISTS", "size": os.path.getsize(path)})
        else:
            results["warnings"].append(f"Optional file missing: {f}")

    readme_path = os.path.join(output_dir, "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, encoding="utf-8") as f:
            content = f.read()
        for section in README_REQUIRED_SECTIONS:
            if section not in content:
                results["valid"] = False
                results["errors"].append(f"README.md missing required section/keyword: {section}")

        # Title noise check (defensive — advisory only).
        # Tópico should be a clean human phrase. Codification prefixes (TR-D7,
        # Research:, etc.) belong to the slug, not the topic. The kb-index
        # cleans these downstream via clean_title_prefixes(), but emitting a
        # warning here surfaces the smell at write-time so authors learn the
        # convention. WARN ratio is 1 — even one tagged title gets flagged.
        topic_match = re.search(r"^>\s*\*\*Tópico:\*\*\s*(.+?)\s*$", content, re.MULTILINE)
        if topic_match:
            topic_value = topic_match.group(1).strip()
            noise_patterns = [
                (r"^TR[-_]?D?\d+", "TR-D7 / TR-7 / TR-1"),
                (r"^Research\s*[—–\-:]", "Research: / Research —"),
                (r"^Tech\s+Research\s*[—–\-:]", "Tech Research:"),
                (r"^Pesquisa\s*[—–\-:]", "Pesquisa:"),
                (r"^Investigation\s*[—–\-:]", "Investigation:"),
            ]
            for pattern, hint in noise_patterns:
                if re.search(pattern, topic_value, re.IGNORECASE):
                    results["warnings"].append(
                        f"README.md **Tópico:** starts with codification prefix "
                        f"matching `{hint}`. Display will be auto-cleaned by "
                        f"research_kb_index.py, but ideally codes live in the "
                        f"slug, not the topic. See templates/output-structure.md."
                    )
                    break

        if "scope_declaration_required: true" in content and "scope_declaration" not in content:
            results["valid"] = False
            results["errors"].append("README.md declares scope_declaration_required but no scope_declaration block was found")

    report_path = os.path.join(output_dir, "02-research-report.md")
    if os.path.exists(report_path):
        with open(report_path, encoding="utf-8") as f:
            content = f.read()
        confidence_tags = len(re.findall(r"\[(?:HIGH|MEDIA|LOW)\s*—", content))
        if confidence_tags == 0:
            results["valid"] = False
            results["errors"].append("02-research-report.md has no confidence tags [HIGH|MEDIA|LOW]")
        results["checks"].append({"check": "confidence_tags", "count": confidence_tags})

        # Source date coverage (QF-5):
        # Count tokens that look like inline source date annotations.
        #   "[Title](url) — 2026"             → with-date
        #   "[Title](url) — 2026-04"          → with-date
        #   "[Title](url) — date_unknown"     → no-date
        # Thresholds (advisory for backwards-compat):
        #   no_date_ratio < 0.20 → OK
        #   0.20 <= ratio < 0.30 → WARN
        #   ratio >= 0.30         → FAIL  (set valid=false)
        #
        # Phase 4.5 CITATION_GATE — Scholarly Source Preference Policy (STORY-154.2):
        # When both scholarly (arXiv/PubMed/Semantic Scholar via scholarly_search.py) and
        # generic web sources are present in results, scholarly sources MUST be ranked higher
        # in the verified_ratio computation. Scholarly sources carry credibility 1.4x vs
        # web search 1.0x. If verified_ratio < 0.85, prefer promoting scholarly sources
        # over generic web pages during the verification step.
        source_dates = len(re.findall(r"—\s*\d{4}", content))
        date_unknown = len(re.findall(r"—\s*date_unknown\b", content, re.IGNORECASE))
        total_dated_or_unknown = source_dates + date_unknown
        if total_dated_or_unknown > 0:
            no_date_ratio = date_unknown / total_dated_or_unknown
            results["checks"].append({
                "check": "source_date_coverage",
                "with_date": source_dates,
                "date_unknown": date_unknown,
                "no_date_ratio": round(no_date_ratio, 3),
            })
            if no_date_ratio >= 0.30:
                results["valid"] = False
                results["errors"].append(
                    f"02-research-report.md has {date_unknown}/{total_dated_or_unknown} sources "
                    f"marked date_unknown (ratio {no_date_ratio:.0%} >= 30%). "
                    "Run Phase 4.5 verify-citations to populate dates via WebFetch."
                )
            elif no_date_ratio >= 0.20:
                results["warnings"].append(
                    f"02-research-report.md has {date_unknown}/{total_dated_or_unknown} sources "
                    f"marked date_unknown (ratio {no_date_ratio:.0%}). Consider re-running "
                    "Phase 4.5 to improve source freshness."
                )
        else:
            results["checks"].append({"check": "source_date_coverage", "count": source_dates})

        # Legacy check kept for downstream consumers reading the older shape.
        results["checks"].append({"check": "source_dates_in_refs", "count": source_dates})

        if re.search(r"\b(alternatives?|comparativo|comparison|landscape|builders?|tools?|frameworks?)\b", content, re.IGNORECASE):
            if "scope_declaration" not in content and "## Scope" not in content:
                results["valid"] = False
                results["errors"].append("Comparison/category report missing scope_declaration or ## Scope section")

        if "## Stop Reason" not in content and "stop_reason" not in content:
            results["valid"] = False
            results["errors"].append("02-research-report.md missing Stop Reason section or stop_reason marker")

    quick_wins_path = os.path.join(output_dir, "quick-wins.md")
    if os.path.exists(quick_wins_path):
        with open(quick_wins_path, encoding="utf-8") as f:
            qw_content = f.read()
        has_selecionados = "## Quick Wins Selecionados" in qw_content
        has_nao_encontrados = "## Quick Wins Não Encontrados" in qw_content
        if not (has_selecionados or has_nao_encontrados):
            results["valid"] = False
            results["errors"].append(
                "quick-wins.md missing required section: '## Quick Wins Selecionados' OR '## Quick Wins Não Encontrados'"
            )
        if has_selecionados:
            qw_block = qw_content.split("## Quick Wins Selecionados", 1)[1]
            qw_block = qw_block.split("\n## ", 1)[0]
            qw_rows = len(re.findall(r"^\|\s*(?:QW-)?[1-9]\d?\s*\|", qw_block, re.MULTILINE))
            results["checks"].append({"check": "quick_wins_rows", "count": qw_rows})
            if qw_rows < 3 and not has_nao_encontrados:
                results["valid"] = False
                results["errors"].append(
                    f"quick-wins.md has {qw_rows} Quick Win rows; minimum is 3 OR include '## Quick Wins Não Encontrados' with documented gap"
                )
            evidence_refs = len(re.findall(r"§\s*\d", qw_block)) + len(re.findall(r"02-research-report\.md", qw_block))
            results["checks"].append({"check": "quick_wins_evidence_refs", "count": evidence_refs})
            if qw_rows >= 1 and evidence_refs == 0:
                results["valid"] = False
                results["errors"].append(
                    "quick-wins.md Quick Wins Selecionados has rows but zero evidence references to 02-research-report.md (each QW must cite §X.Y)"
                )

    metrics = _load_structured_file(os.path.join(output_dir, "metrics.yaml"))
    pipeline_state = _load_structured_file(os.path.join(output_dir, "pipeline-state.yaml"))

    for field in ["workflow_version", "coverage_score", "integrity_score", "citation_verified", "stop_reason", "rubrics", "runtime_contract"]:
        if field not in metrics:
            results["valid"] = False
            results["errors"].append(f"metrics.yaml missing required field: {field}")

    rubrics = metrics.get("rubrics")
    if not isinstance(rubrics, dict) or not rubrics:
        results["valid"] = False
        results["errors"].append("metrics.yaml rubrics must be a non-empty mapping")
    else:
        for axis in ["information_recall", "analysis", "presentation"]:
            axis_value = rubrics.get(axis)
            if not isinstance(axis_value, dict) or "passed" not in axis_value or "total" not in axis_value:
                results["valid"] = False
                results["errors"].append(f"metrics.yaml rubrics missing passed/total for axis: {axis}")

    if not pipeline_state.get("pipeline_id"):
        results["valid"] = False
        results["errors"].append("pipeline-state.yaml missing required field: pipeline_id")
    if not pipeline_state.get("status"):
        results["valid"] = False
        results["errors"].append("pipeline-state.yaml missing required field: status")
    if "stop_reason" not in pipeline_state:
        results["valid"] = False
        results["errors"].append("pipeline-state.yaml missing required field: stop_reason")

    curiosity = _load_structured_file(os.path.join(output_dir, "curiosity_queue.yaml"))
    if "items" not in curiosity or not isinstance(curiosity.get("items"), list):
        results["valid"] = False
        results["errors"].append("curiosity_queue.yaml missing list field: items")

    execution_log_path = os.path.join(output_dir, "execution-log.jsonl")
    if os.path.exists(execution_log_path):
        with open(execution_log_path, encoding="utf-8") as f:
            rows = [line.strip() for line in f if line.strip()]
        if not rows:
            results["valid"] = False
            results["errors"].append("execution-log.jsonl is empty")
        for idx, row in enumerate(rows, start=1):
            try:
                json.loads(row)
            except json.JSONDecodeError:
                results["valid"] = False
                results["errors"].append(f"execution-log.jsonl line {idx} is not valid JSON")

    follow_ups = [f for f in os.listdir(output_dir) if re.match(r"0[4-9]-.*\.md|[1-9]\d-.*\.md", f)]
    if follow_ups:
        results["checks"].append({"check": "follow_up_files", "count": len(follow_ups), "files": follow_ups})

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Validate tech-research pipeline output structure.",
    )
    parser.add_argument(
        "--mode",
        choices=["current", "target"],
        default="current",
        help=(
            "Validation mode. 'current' (default) checks the V1 baseline that all "
            "Claude Code + Codex runs must produce. 'target' adds V3 cognitive "
            "atoms (curiosity_queue.yaml, evolving_report.md, execution-log.jsonl) "
            "expected after spy v5 evolution. Default mode is the gate that runs "
            "today; target mode is the aspirational gate."
        ),
    )
    parser.add_argument("output_dir", help="Path to docs/research/{date}-{slug}/")
    args = parser.parse_args()

    global REQUIRED_FILES
    REQUIRED_FILES = (
        REQUIRED_FILES_TARGET if args.mode == "target" else REQUIRED_FILES_CURRENT
    )

    result = validate_output(args.output_dir)
    result["mode"] = args.mode
    print(json.dumps(result, indent=2))

    if not result["valid"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
