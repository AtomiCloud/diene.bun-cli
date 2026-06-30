#!/usr/bin/env bash
set -euo pipefail

# GoReleaser post-build hook: swap the prebuilt Bun binary in over GoReleaser's Go placeholder.
#
# GoReleaser passes the destination path it just "built", plus the libc id and the Go os/arch.
# We map that onto the matching Bun artifact in prebuilt/ (produced by scripts/release/compile.sh)
# and copy it into place. The Bun-artifact name is resolved from the SINGLE config surface via the
# config bridge (scripts/config/print-config.ts + jq) — exactly like compile.sh/fury.sh — so the
# os/arch/libc → artifact mapping (incl. the x64-baseline and musl naming) lives only in
# src/config/cli-config.ts, not duplicated here.
#
# Usage: goreleaser-shim.sh <dest-path> <glibc|musl> <goos> <goarch>

dest="$1"
libc="$2"
goos="$3"
goarch="$4"

PREBUILT_DIR="${PREBUILT_DIR:-prebuilt}"

case "${goarch}" in
amd64) arch="x64" ;;
arm64) arch="arm64" ;;
*)
  echo "❌ unsupported arch: ${goarch}" >&2
  exit 1
  ;;
esac

# Resolve the prebuilt artifact filename from the config surface (the compileTargets entry whose
# os/arch/libc match), so there is one source of truth for naming (FR12 / config bridge).
src="$(bun run scripts/config/print-config.ts |
  jq -r --arg os "${goos}" --arg arch "${arch}" --arg libc "${libc}" \
    'first(.compileTargets[] | select(.os == $os and .arch == $arch and .libc == $libc) | .artifact) // empty')"
[[ -n ${src} ]] || {
  echo "❌ no compile target in the config surface for ${goos}/${arch}/${libc}" >&2
  exit 1
}

srcpath="${PREBUILT_DIR}/${src}"
[[ -f ${srcpath} ]] || {
  echo "❌ prebuilt binary not found: ${srcpath} (did 'pls compile' run into ${PREBUILT_DIR}/?)" >&2
  exit 1
}

cp "${srcpath}" "${dest}"
chmod +x "${dest}"
echo "✅ swapped ${srcpath} -> ${dest}"
