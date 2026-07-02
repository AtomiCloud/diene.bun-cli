#!/usr/bin/env bash
set -euo pipefail

# Stamp the release version into package.json so builds from the tag report the real version.
die() {
  echo "❌ $1" >&2
  exit 1
}

version="${1:?Usage: bump.sh <version>}"

# `sg release -i npm` mutates package.json (ephemeral plugin installs) — restore before stamping.
git checkout HEAD -- package.json
# Version-only edit: bun.lock does not pin the root version, so no lockfile change is needed.
bun pm pkg set "version=${version}"
grep -q "\"version\": \"${version}\"" package.json || die "failed to stamp version ${version} into package.json"
echo "✅ package.json version -> ${version}"
