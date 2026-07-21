#!/usr/bin/env bash
# compare-run-artifacts.sh — X01/X02/X03 binary gate for tech-research runs.
#
# Compares a research output directory against the E07 Codex gold-standard
# baseline (docs/research/2026-05-06-harness-repositories-apr-may-2026/).
#
# Mechanical checks (Wave 14 Appendix C.4 criteria):
#   1. File parity: candidate has every file E07 has (extras allowed).
#   2. metrics.yaml fields: workflow_version, coverage_score, integrity_score,
#      citation_verified, stop_reason, rubrics, runtime_contract.
#   3. pipeline-state.yaml fields: pipeline_id, status, stop_reason.
#   4. README sections: TL;DR, Research Metadata, workflow_version,
#      coverage_score, citation_verified, stop_reason.
#   5. Confidence tags present in 02-research-report.md.
#
# Usage:
#   compare-run-artifacts.sh <candidate_dir> [<baseline_dir>]
#
# Default baseline: docs/research/2026-05-06-harness-repositories-apr-may-2026/
#
# Exit codes:
#   0  parity (all checks pass)
#   1  drift (one or more checks fail)
#   2  bad invocation
#
# Source: handoff 2026-05-06-tech-research-improvement-and-spy-evolution.md A3.

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DEFAULT_BASELINE="${REPO_ROOT}/docs/research/2026-05-06-harness-repositories-apr-may-2026"

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <candidate_dir> [<baseline_dir>]" >&2
  exit 2
fi

CANDIDATE="$1"
BASELINE="${2:-$DEFAULT_BASELINE}"

if [[ ! -d "$CANDIDATE" ]]; then
  echo "ERROR: candidate dir not found: $CANDIDATE" >&2
  exit 2
fi
if [[ ! -d "$BASELINE" ]]; then
  echo "ERROR: baseline dir not found: $BASELINE" >&2
  exit 2
fi

EXIT_CODE=0
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); EXIT_CODE=1; }

echo "================================================================"
echo "compare-run-artifacts.sh"
echo "  candidate: $CANDIDATE"
echo "  baseline:  $BASELINE"
echo "================================================================"

# --- Check 1: file parity ---------------------------------------------------
echo ""
echo "[1/5] File parity (candidate must have every file baseline has)"
while IFS= read -r f; do
  rel="${f#$BASELINE/}"
  if [[ -f "$CANDIDATE/$rel" ]]; then
    pass "file present: $rel"
  else
    fail "file missing: $rel"
  fi
done < <(find "$BASELINE" -maxdepth 1 -type f | sort)

# --- Check 2: metrics.yaml fields (dynamic — every field baseline has) ------
# Baseline-driven: extract top-level YAML keys from baseline metrics.yaml and
# require the candidate to contain at least the same set. This avoids the
# REQUIRED_FILES paradox at field level: we only ask candidates to match the
# real baseline (E07), not an aspirational V3 schema.
echo ""
echo "[2/5] metrics.yaml fields parity (vs baseline)"
METRICS_BASE="$BASELINE/metrics.yaml"
METRICS="$CANDIDATE/metrics.yaml"
if [[ -f "$METRICS" && -f "$METRICS_BASE" ]]; then
  while IFS= read -r field; do
    [[ -z "$field" ]] && continue
    if grep -qE "^${field}:" "$METRICS"; then
      pass "metrics.yaml has: $field"
    else
      fail "metrics.yaml missing: $field"
    fi
  done < <(grep -E "^[a-z_]+:" "$METRICS_BASE" | awk -F: '{print $1}')
else
  [[ ! -f "$METRICS" ]] && fail "metrics.yaml not present in candidate"
  [[ ! -f "$METRICS_BASE" ]] && fail "metrics.yaml not present in baseline (cannot derive parity set)"
fi

# --- Check 3: pipeline-state.yaml fields (dynamic) --------------------------
echo ""
echo "[3/5] pipeline-state.yaml fields parity (vs baseline)"
PSTATE_BASE="$BASELINE/pipeline-state.yaml"
PSTATE="$CANDIDATE/pipeline-state.yaml"
if [[ -f "$PSTATE" && -f "$PSTATE_BASE" ]]; then
  while IFS= read -r field; do
    [[ -z "$field" ]] && continue
    if grep -qE "^${field}:" "$PSTATE"; then
      pass "pipeline-state.yaml has: $field"
    else
      fail "pipeline-state.yaml missing: $field"
    fi
  done < <(grep -E "^[a-z_]+:" "$PSTATE_BASE" | awk -F: '{print $1}')
else
  [[ ! -f "$PSTATE" ]] && fail "pipeline-state.yaml not present in candidate"
  [[ ! -f "$PSTATE_BASE" ]] && fail "pipeline-state.yaml not present in baseline"
fi

# --- Check 4: README structural keywords ------------------------------------
# Use a small intersection that any tech-research README should contain. This
# is the only check intentionally schema-driven (not baseline-driven), because
# the baseline is allowed to be more sparse than the canonical contract.
echo ""
echo "[4/5] README.md structural keywords"
README="$CANDIDATE/README.md"
if [[ -f "$README" ]]; then
  for kw in "TL;DR" "Research Metadata" "coverage_score"; do
    if grep -qF "$kw" "$README"; then
      pass "README has: $kw"
    else
      fail "README missing: $kw"
    fi
  done
else
  fail "README.md not present in candidate"
fi

# --- Check 5: confidence tags in 02-research-report.md ----------------------
echo ""
echo "[5/5] 02-research-report.md confidence tags"
REPORT="$CANDIDATE/02-research-report.md"
if [[ -f "$REPORT" ]]; then
  TAGS=$(grep -cE "\[(HIGH|MEDIA|LOW)[[:space:]]*—" "$REPORT" || true)
  if [[ "$TAGS" -gt 0 ]]; then
    pass "02-research-report.md has $TAGS confidence tag(s)"
  else
    fail "02-research-report.md has zero confidence tags [HIGH|MEDIA|LOW]"
  fi
else
  fail "02-research-report.md not present in candidate"
fi

# --- Summary ----------------------------------------------------------------
echo ""
echo "================================================================"
echo "Result: PASS=$PASS  FAIL=$FAIL"
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "Verdict: PARITY (X01/X02/X03 gate cleared)"
else
  echo "Verdict: DRIFT (gate failed — see FAIL lines above)"
fi
echo "================================================================"

exit "$EXIT_CODE"
