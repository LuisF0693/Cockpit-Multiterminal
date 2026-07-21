#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-.}"
echo "Preparing design-system runtime context in ${ROOT_DIR}"
python3 squads/design-system/scripts/validate-design-squad.py --help >/dev/null 2>&1 || true
