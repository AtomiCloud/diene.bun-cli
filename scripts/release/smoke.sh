#!/usr/bin/env bash
set -euo pipefail

# Smoke-test one standalone binary: run --version/--help and assert the help banner + a command.
bin="${1:?Usage: smoke.sh <path-to-binary>}"
chmod +x "${bin}"
xattr -d com.apple.quarantine "${bin}" 2>/dev/null || true # mac-only; harmless elsewhere

"${bin}" --version
help="$("${bin}" --help)"
printf '%s\n' "${help}"

grep -q 'Usage:' <<<"${help}" || {
  echo "❌ --help is missing its usage banner" >&2
  exit 1
}
grep -q 'set' <<<"${help}" || {
  echo "❌ --help is missing the 'set' command" >&2
  exit 1
}

echo "✅ smoke ok: ${bin}"
