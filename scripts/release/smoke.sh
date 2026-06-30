#!/usr/bin/env bash
set -euo pipefail

# Smoke-test one standalone binary (FR5/FR9): run --version and --help, assert exit 0 and that
# the help banner advertises the CLI and a known command.
#
# Deliberately generic — the ONLY per-target input is the binary path (the matrix parameter).
# All per-target environment differences (runner, Alpine container) live in the matrix YAML,
# not here. The single mac-specific need (unquarantine) is a tolerant no-op everywhere else,
# so this exact script runs identically on every target.

bin="${1:?Usage: smoke.sh <path-to-binary>}"
chmod +x "${bin}"
xattr -d com.apple.quarantine "${bin}" 2>/dev/null || true # mac-only; harmless elsewhere

"${bin}" --version
help="$("${bin}" --help)"
printf '%s\n' "${help}"

printf '%s\n' "${help}" | grep -q 'Usage:' || {
  echo "❌ --help is missing its usage banner" >&2
  exit 1
}
printf '%s\n' "${help}" | grep -q 'set' || {
  echo "❌ --help is missing the 'set' command" >&2
  exit 1
}

echo "✅ smoke ok: ${bin}"
