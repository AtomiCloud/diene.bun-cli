#!/usr/bin/env bash
set -euo pipefail

# GoReleaser post-build hook: overwrite GoReleaser's Go placeholder with the prebuilt Bun binary.
# GoReleaser's `prebuilt` builder is Pro-only, so — exactly like sulfone.iridium — we compile a
# trivial Go stub and swap the real Bun binary (from prebuilt/, built by compile.sh) in here.
# Args: <dest-path> <goos> <goarch>.
die() {
  echo "❌ $1" >&2
  exit 1
}

dest="$1"
case "$2/$3" in
linux/amd64) src="bun-cli-linux-x64-baseline" ;;
linux/arm64) src="bun-cli-linux-arm64" ;;
darwin/arm64) src="bun-cli-darwin-arm64" ;;
*) die "unsupported target: $2/$3" ;;
esac

srcpath="${PREBUILT_DIR:-prebuilt}/${src}"
[ -f "${srcpath}" ] || die "prebuilt binary not found: ${srcpath} (did compile.sh run into ${PREBUILT_DIR:-prebuilt}/?)"
cp "${srcpath}" "${dest}"
echo "swapped ${srcpath} -> ${dest}"
