#!/usr/bin/env bash
set -euo pipefail

# Orchestrate the release (FR6/FR7/FR8).
#
#   publish.sh            → real release: goreleaser build + package, push to every channel
#   publish.sh --snapshot → dry-run: build + package everything into dist/ with NO publish
#
# In both modes the prebuilt Bun binaries are compiled first into prebuilt/ (a directory
# GoReleaser's --clean leaves alone, unlike dist/), where the goreleaser-shim.sh hook reads them.
#
# Release ownership (FR8): semantic-release is the SOLE owner of the git tag AND the GitHub
# release. GoReleaser runs with `release.disable: true` (see .goreleaser.yaml) so it never
# creates or races a release. The GitHub-release assets (archives, checksums, install.sh) are
# uploaded explicitly here via github-assets.sh, which waits for the semantic-release release to
# exist first. The brew formula is pushed to the tap by GoReleaser; deb/rpm/apk go to Gemfury.

SNAPSHOT=0
if [[ ${1:-} == "--snapshot" ]]; then
  SNAPSHOT=1
fi

echo "🔨 Compiling prebuilt Bun binaries into prebuilt/ ..."
COMPILE_OUTDIR="prebuilt" ./scripts/release/compile.sh

if [[ ${SNAPSHOT} -eq 1 ]]; then
  echo "📦 GoReleaser snapshot (no publish) ..."
  goreleaser release --snapshot --clean
  echo "✅ Snapshot complete — artifacts in dist/, nothing was published."
  exit 0
fi

echo "📦 GoReleaser release (builds dist/, publishes brew; never creates a GitHub release) ..."
goreleaser release --clean

echo "📤 Pushing Linux packages to Gemfury ..."
./scripts/release/fury.sh

echo "📤 Uploading archives + checksums + installer onto the semantic-release GitHub release ..."
./scripts/release/github-assets.sh

echo "✅ Release complete."
