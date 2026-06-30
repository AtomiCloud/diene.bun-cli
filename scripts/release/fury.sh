#!/usr/bin/env bash
set -euo pipefail

# Push the built Linux packages (deb/rpm/apk) to Gemfury (FR7), mirroring sulfone.iridium.
# The Gemfury push endpoint is read from the single config surface so there is one source of
# truth for the account.
#
# Requires: FURY_TOKEN in the environment. Runs after `goreleaser release`, against dist/.

[[ -n ${FURY_TOKEN:-} ]] || {
  echo "❌ 'FURY_TOKEN' env var not set" >&2
  exit 1
}

endpoint="$(bun run scripts/config/print-config.ts | jq -r '.pushEndpoint')"
[[ -n ${endpoint} && ${endpoint} != "null" ]] || {
  echo "❌ could not read pushEndpoint from config surface" >&2
  exit 1
}

shopt -s nullglob
packages=(dist/*.deb dist/*.rpm dist/*.apk)
[[ ${#packages[@]} -gt 0 ]] || {
  echo "❌ no deb/rpm/apk packages found in dist/" >&2
  exit 1
}

for pkg in "${packages[@]}"; do
  echo "📤 pushing ${pkg} -> ${endpoint}"
  curl -fsS -F package=@"${pkg}" "https://${FURY_TOKEN}@${endpoint}/"
done

echo "✅ pushed ${#packages[@]} package(s) to Gemfury"
