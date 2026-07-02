#!/usr/bin/env bash
set -euo pipefail

# Cross-compile the standalone CLI (entry from package.json .bin) for every supported target.
./scripts/ci/setup.sh

ENTRY="$(jq -r '.bin | to_entries[0].value' package.json)"
[ -n "${ENTRY}" ] && [ "${ENTRY}" != "null" ] || {
  echo "❌ no .bin entry in package.json" >&2
  exit 1
}

OUTDIR="${COMPILE_OUTDIR:-dist/bin}"
mkdir -p "${OUTDIR}"

# bunTarget<TAB>artifact — x64 uses the -baseline build (no AVX2) so it runs under QEMU too.
targets="bun-linux-x64-baseline	bun-cli-linux-x64-baseline
bun-linux-arm64	bun-cli-linux-arm64
bun-darwin-arm64	bun-cli-darwin-arm64"

count=0
while IFS=$'\t' read -r target artifact; do
  [ -n "${target}" ] || continue
  echo "🔨 compiling ${target} -> ${OUTDIR}/${artifact}"
  bun build "./${ENTRY}" --compile --target="${target}" --outfile "${OUTDIR}/${artifact}"
  count=$((count + 1))
done <<<"${targets}"

echo "✅ compiled ${count} target(s) into ${OUTDIR}"
ls -la "${OUTDIR}"
