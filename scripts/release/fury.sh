#!/usr/bin/env bash
set -euo pipefail

# Push the built Linux packages (deb/rpm) to Gemfury. Requires FURY_TOKEN. Runs against dist/.
[ -z "${FURY_TOKEN:-}" ] && echo "❌ 'FURY_TOKEN' env var not set" >&2 && exit 1

endpoint="push.fury.io/atomicloud"

shopt -s nullglob
packages=(dist/*.deb dist/*.rpm)
[ "${#packages[@]}" -eq 0 ] && echo "❌ no deb/rpm packages found in dist/" >&2 && exit 1

for pkg in "${packages[@]}"; do
  echo "📤 pushing ${pkg} -> ${endpoint}"
  curl -fsS --connect-timeout 30 --max-time 600 -F package=@"${pkg}" "https://${FURY_TOKEN}@${endpoint}/"
done

echo "✅ pushed ${#packages[@]} package(s) to Gemfury"
