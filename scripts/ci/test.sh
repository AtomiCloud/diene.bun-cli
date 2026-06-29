#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ ${MODE} != "unit" && ${MODE} != "int" ]]; then
  echo "❌ usage: $0 <unit|int>" >&2
  exit 2
fi

CONFIG="bunfig.${MODE}.toml"
COVERAGE_DIR="coverage/${MODE}"

./scripts/ci/setup.sh

echo "🧪 Running ${MODE} tests with coverage..."
rm -rf "${COVERAGE_DIR}"

set +e
bun test --config="${CONFIG}" --coverage
test_status=$?
set -e

if [[ -f "${COVERAGE_DIR}/lcov.info" ]]; then
  echo "✅ Coverage artifact: ${COVERAGE_DIR}/lcov.info"
else
  echo "❌ No coverage artifact found at ${COVERAGE_DIR}/lcov.info" >&2
  exit 1
fi

if [[ ${test_status} -ne 0 ]]; then
  echo "❌ ${MODE} tests failed (exit ${test_status})" >&2
  exit "${test_status}"
fi
echo "✅ ${MODE} tests passed"
