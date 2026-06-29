#!/usr/bin/env bash
set -euo pipefail

ARTIFACT="dist/index.js"

./scripts/ci/setup.sh

echo "🔨 Building sample bundle..."
bun build ./src/index.ts --outdir ./dist --target bun

if [[ ! -f ${ARTIFACT} ]]; then
  echo "❌ Build artifact missing: ${ARTIFACT}" >&2
  exit 1
fi
echo "✅ Build artifact present: ${ARTIFACT}"
