#!/usr/bin/env bash
set -euo pipefail

# SIT: black-box journeys through the compiled binary (no coverage — see the testing standard).
./scripts/ci/setup.sh

os="$([ "$(uname -s)" = "Darwin" ] && echo darwin || echo linux)"
case "$(uname -m)" in
arm64 | aarch64) arch="arm64" ;;
*) arch="x64-baseline" ;;
esac
CLI_BIN="${CLI_BIN:-dist/bin/bun-cli-${os}-${arch}}"

# CI downloads the compile artifact; locally, compile on demand.
[ -f "${CLI_BIN}" ] || ./scripts/release/compile.sh
chmod +x "${CLI_BIN}"

echo "🧪 Running SIT against ${CLI_BIN}..."
CLI_BIN="${CLI_BIN}" bun test --config=bunfig.sit.toml
echo "✅ SIT passed"
