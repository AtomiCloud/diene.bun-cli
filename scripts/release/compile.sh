#!/usr/bin/env bash
set -euo pipefail

# Cross-compile the standalone CLI binary for every supported target (FR4).
#
# The target list is read from the single config surface (src/config/cli-config.ts) via
# scripts/config/print-config.ts, so there is exactly one source of truth. Each artifact is
# emitted into a stable dist/bin/ layout that the smoke matrix and the GoReleaser shim consume.

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
