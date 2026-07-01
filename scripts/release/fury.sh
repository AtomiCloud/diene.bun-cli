#!/usr/bin/env bash
set -euo pipefail

# Push the built Linux packages (deb/rpm) to Gemfury. Requires FURY_TOKEN. Runs against dist/.
die() {
  echo "❌ $1" >&2
  exit 1
}

[ -z "${FURY_TOKEN:-}" ] && die "'FURY_TOKEN' env var not set"

endpoint="push.fury.io/atomicloud"

shopt -s nullglob
packages=(dist/*.deb dist/*.rpm)
[ "${#packages[@]}" -gt 0 ] || die "no deb/rpm packages found in dist/"

for pkg in "${packages[@]}"; do
  echo "📤 pushing ${pkg} -> ${endpoint}"
  curl -fsS -F package=@"${pkg}" "https://${FURY_TOKEN}@${endpoint}/"
done

echo "✅ pushed ${#packages[@]} package(s) to Gemfury"
