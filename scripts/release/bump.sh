#!/usr/bin/env bash
set -euo pipefail

# Stamp the release version into package.json so builds from the tag report the real version.
die() {
  echo "❌ $1" >&2
  exit 1
}

version="${1:?Usage: bump.sh <version>}"

sed -i.bak -E "s/\"version\": \"[^\"]+\"/\"version\": \"${version}\"/" package.json
rm -f package.json.bak
grep -q "\"version\": \"${version}\"" package.json || die "failed to stamp version ${version} into package.json"
echo "✅ package.json version -> ${version}"
