#!/usr/bin/env bash
set -euo pipefail

# Upload the GitHub-release assets onto the release that semantic-release created (FR7/FR8/C1).
#
# semantic-release owns the tag AND the GitHub release; GoReleaser runs with
# `release.disable: true` so it never creates one. This script therefore:
#   1. resolves the tag (GITHUB_REF_NAME in CD, else the latest git tag),
#   2. waits for the semantic-release-created release to exist (it is created on the same tag,
#      but the tag push that triggers CD can win the race — so we poll instead of assuming),
#   3. uploads the archives, checksums, and the one-line install.sh as release assets.
#
# The installer is attached here (not via GoReleaser) precisely because GoReleaser never
# touches the release; this is what makes the documented
#   .../releases/latest/download/install.sh
# URL resolve. Requires: gh + GITHUB_TOKEN in the environment.

[[ -n ${GITHUB_TOKEN:-} ]] || {
  echo "❌ 'GITHUB_TOKEN' env var not set" >&2
  exit 1
}

TAG="${GITHUB_REF_NAME:-}"
if [[ -z ${TAG} ]]; then
  TAG="$(git describe --tags --abbrev=0 2>/dev/null || true)"
fi
[[ -n ${TAG} ]] || {
  echo "❌ could not resolve the release tag" >&2
  exit 1
}

echo "⏳ waiting for the semantic-release GitHub release for ${TAG} ..."
attempts=0
until gh release view "${TAG}" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [[ ${attempts} -ge 30 ]]; then
    echo "❌ release ${TAG} did not appear after ${attempts} attempts (semantic-release did not create it)" >&2
    exit 1
  fi
  sleep 10
done

shopt -s nullglob
# The archive glob can expand to nothing (nullglob) — validate it actually matched. The literal
# paths below never disappear from an array, so they must be checked with `-f`, not by array
# length (a length guard over literal paths is always true → dead code).
archives=(dist/*.tar.gz)
[[ ${#archives[@]} -gt 0 ]] || {
  echo "❌ no archives (dist/*.tar.gz) found to upload" >&2
  exit 1
}
[[ -f dist/checksums.txt ]] || {
  echo "❌ required asset dist/checksums.txt not found" >&2
  exit 1
}
[[ -f scripts/release/install.sh ]] || {
  echo "❌ required asset scripts/release/install.sh not found" >&2
  exit 1
}
assets=("${archives[@]}" dist/checksums.txt scripts/release/install.sh)

echo "📤 uploading ${#assets[@]} asset(s) onto release ${TAG} ..."
gh release upload "${TAG}" "${assets[@]}" --clobber

echo "✅ uploaded assets (incl. install.sh) onto ${TAG}"
