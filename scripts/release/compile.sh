#!/usr/bin/env bash
set -euo pipefail

# Cross-compile the standalone CLI binary for every supported target (FR4).
#
# The target list is read from the single config surface (src/config/cli-config.ts) via
# scripts/config/print-config.ts, so there is exactly one source of truth. Each artifact is
# emitted into a stable dist/bin/ layout that the smoke matrix and the GoReleaser shim consume.

# Install dependencies first (matches scripts/ci/build.sh|test.sh|pre-commit.sh): the compile job
# runs on a fresh runner with no node_modules, and `bun build --compile` must resolve the CLI's
# runtime deps (commander/chalk/inquirer/ioredis). Idempotent + fast when already installed.
./scripts/ci/setup.sh

ENTRY="bin/bun-cli.ts"
OUTDIR="${COMPILE_OUTDIR:-dist/bin}"

mkdir -p "${OUTDIR}"

config="$(bun run scripts/config/print-config.ts)"

count=0
while IFS=$'\t' read -r target artifact; do
  [[ -n ${target} ]] || continue
  echo "🔨 compiling ${target} -> ${OUTDIR}/${artifact}"
  bun build "./${ENTRY}" --compile --target="${target}" --outfile "${OUTDIR}/${artifact}"
  count=$((count + 1))
done < <(printf '%s\n' "${config}" | jq -r '.compileTargets[] | [.bunTarget, .artifact] | @tsv')

[[ ${count} -gt 0 ]] || {
  echo "❌ no targets compiled — check compileTargets in the config surface" >&2
  exit 1
}

echo "✅ compiled ${count} target(s) into ${OUTDIR}"
ls -la "${OUTDIR}"
