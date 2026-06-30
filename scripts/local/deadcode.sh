#!/usr/bin/env bash
set -euo pipefail

# Informational dead-code review (NON-BLOCKING). Both knip runs below use the `.llm.json`
# configs with `--no-exit-code`, so this script always exits 0 — its findings (unused exports,
# config hints, the publish.sh unlisted-binary note) are advisory, surfaced for an LLM/human to
# triage, NOT a gate.
#
# The BLOCKING dead-code gates are the pre-commit hooks (see nix/pre-commit.nix):
#   - "Knip Repo Deadcode"       -> knip --config knip.json            (no --no-exit-code: fails CI)
#   - "Knip Production Deadcode" -> knip --config knip.production.json (no --no-exit-code: fails CI)
# Those run on every commit and in `pls lint`; both must Pass. The `.llm.json` configs here are a
# strict superset that report extra hints those blocking configs intentionally ignore.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

echo "📦 Installing dependencies..."
bun install --frozen-lockfile

echo "📝 Repo dead-code review (informational, non-blocking)"
./node_modules/.bin/knip --config knip.llm.json --no-exit-code

echo "📝 Production dead-code review (informational, non-blocking)"
./node_modules/.bin/knip --config knip.production.llm.json --no-exit-code
