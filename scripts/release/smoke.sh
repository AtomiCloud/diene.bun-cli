#!/usr/bin/env bash
set -euo pipefail

# Smoke-test one standalone binary: run --version/--help and assert the help banner + a command.
die() {
  echo "❌ $1" >&2
  exit 1
}

bin="${1:?Usage: smoke.sh <path-to-binary>}"
chmod +x "${bin}"
xattr -d com.apple.quarantine "${bin}" 2>/dev/null || true # mac-only; harmless elsewhere

"${bin}" --version
help="$("${bin}" --help)"
printf '%s\n' "${help}"

grep -q 'Usage:' <<<"${help}" || die "--help is missing its usage banner"
grep -q 'set' <<<"${help}" || die "--help is missing the 'set' command"

echo "✅ smoke ok: ${bin}"
