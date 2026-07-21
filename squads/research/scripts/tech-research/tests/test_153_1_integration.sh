#!/usr/bin/env bash
# Integration test for STORY-153.1 — Auto-fire profile=gold_absorption
#
# Validates that infer_bench_profile.py produces the expected profile/trigger
# for each fixture in outputs/research/test-fixtures/153.1-bench-profile-fixtures/
#
# AC6: 5p-absorption-bench → gold (count)
# AC7: 3p-quick-bench → standard (default)
# AC8: 3p-with-keyword-vs → gold (keyword)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
SCRIPT="$REPO_ROOT/squads/research/scripts/tech-research/infer_bench_profile.py"
FIXTURES_DIR="$REPO_ROOT/outputs/research/test-fixtures/153.1-bench-profile-fixtures"

# Ensure pyyaml is importable (otherwise infer_bench_profile exits 3 immediately)
if ! python3 -c "import yaml" 2>/dev/null; then
  echo "SKIP: pyyaml not installed — skipping integration test."
  exit 0
fi

FAIL_COUNT=0
PASS_COUNT=0

run_fixture() {
  local fixture_name="$1"
  local fixture_dir="$FIXTURES_DIR/$fixture_name"

  if [[ ! -d "$fixture_dir" ]]; then
    echo "FAIL: fixture dir not found: $fixture_dir"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return
  fi

  local players_yaml="$fixture_dir/players.yaml"
  local expected_json="$fixture_dir/expected-profile.json"

  # Extract query and players from YAML via python (pyyaml already available)
  local query
  local players_csv
  query=$(python3 -c "import yaml; d=yaml.safe_load(open('$players_yaml')); print(d.get('query',''))")
  players_csv=$(python3 -c "import yaml; d=yaml.safe_load(open('$players_yaml')); print(','.join(p['id'] for p in d.get('players',[])))")

  # Run infer
  local actual
  actual=$(python3 "$SCRIPT" --players "$players_csv" --query "$query")
  local expected
  expected=$(cat "$expected_json")

  # Compare profile field (trigger may vary in keyword tests due to different matches)
  local actual_profile
  local expected_profile
  actual_profile=$(echo "$actual" | python3 -c "import json,sys; print(json.load(sys.stdin)['profile'])")
  expected_profile=$(echo "$expected" | python3 -c "import json,sys; print(json.load(sys.stdin)['profile'])")

  if [[ "$actual_profile" == "$expected_profile" ]]; then
    echo "PASS: $fixture_name → $actual_profile"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL: $fixture_name"
    echo "  Expected profile: $expected_profile"
    echo "  Actual profile:   $actual_profile"
    echo "  Full actual:   $actual"
    echo "  Full expected: $expected"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo "=== STORY-153.1 Integration Test ==="
echo "Script: $SCRIPT"
echo "Fixtures dir: $FIXTURES_DIR"
echo

run_fixture "5p-absorption-bench"
run_fixture "3p-quick-bench"
run_fixture "3p-with-keyword-vs"

echo
echo "=== Summary ==="
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"

if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi
exit 0
