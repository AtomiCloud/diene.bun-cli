#!/usr/bin/env bash
set -euo pipefail

# Print the dist/bin/ artifact path for THIS host's OS/arch so `pls compile:smoke` runs the
# locally-runnable binary. Prints nothing when the host has no shipped target.
OUTDIR="${COMPILE_OUTDIR:-dist/bin}"

case "$(uname -s)" in
Darwin) os="darwin" ;;
Linux) os="linux" ;;
*) exit 0 ;;
esac

case "$(uname -m)" in
arm64 | aarch64) arch="arm64" ;;
x86_64) arch="x64" ;;
*) exit 0 ;;
esac

case "${os}-${arch}" in
linux-x64) artifact="bun-cli-linux-x64-baseline" ;;
linux-arm64) artifact="bun-cli-linux-arm64" ;;
darwin-arm64) artifact="bun-cli-darwin-arm64" ;;
*) exit 0 ;;
esac

printf '%s\n' "${OUTDIR}/${artifact}"
