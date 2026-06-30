#!/usr/bin/env bash
set -euo pipefail

# Resolve the dist/bin/ artifact path for THIS host's OS/arch so `pls compile:smoke` smoke-tests
# the locally-runnable binary on any platform (a hardcoded default would exec-format-error on
# every other host).
#
# Why a script and not inline in the Taskfile: host detection is a multi-branch conditional, which
# the Taskfile convention says belongs in a local helper, not in a Taskfile var. The artifact NAME
# is resolved from the single config surface via the config bridge (scripts/config/print-config.ts
# + jq) — exactly like compile.sh/goreleaser-shim.sh — so no artifact filename is duplicated
# outside src/config/cli-config.ts (FR12). Local smoke runs the binary natively, so it always
# prefers the glibc build for this host's os/arch.
#
# Prints the binary path (e.g. dist/bin/bun-cli-linux-x64-baseline) on stdout, or nothing when the
# host has no shipped target — smoke.sh then errors clearly on the empty/missing path.

OUTDIR="${COMPILE_OUTDIR:-dist/bin}"

case "$(uname -s)" in
Darwin) os="darwin" ;;
Linux) os="linux" ;;
*) os="" ;;
esac

case "$(uname -m)" in
arm64 | aarch64) arch="arm64" ;;
x86_64) arch="x64" ;;
*) arch="" ;;
esac

artifact=""
if [[ -n ${os} && -n ${arch} ]]; then
  artifact="$(bun run scripts/config/print-config.ts |
    jq -r --arg os "${os}" --arg arch "${arch}" \
      'first(.compileTargets[] | select(.os == $os and .arch == $arch and .libc == "glibc") | .artifact) // empty')"
fi

[[ -n ${artifact} ]] || exit 0
printf '%s\n' "${OUTDIR}/${artifact}"
