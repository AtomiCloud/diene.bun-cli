#!/usr/bin/env bash
set -euo pipefail

ARTIFACT="dist/bun-cli.js"

./scripts/ci/setup.sh

echo "🔨 Building CLI bundle..."
bun build ./bin/bun-cli.ts --outdir ./dist --target bun

if [[ ! -f ${ARTIFACT} ]]; then
  echo "❌ Build artifact missing: ${ARTIFACT}" >&2
  exit 1
fi
echo "✅ Build artifact present: ${ARTIFACT}"
