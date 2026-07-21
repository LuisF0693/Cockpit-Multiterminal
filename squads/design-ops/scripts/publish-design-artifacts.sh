#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="${1:-outputs/design-system}"
echo "Publishing validated design artifacts from ${ARTIFACT_DIR}"
test -d "${ARTIFACT_DIR}" || exit 0
