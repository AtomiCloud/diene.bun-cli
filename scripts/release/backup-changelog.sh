#!/usr/bin/env bash
set -euo pipefail

# Save the previous changelog so publish.sh can diff this version's section for release notes.
if [ -f Changelog.md ]; then
  cp Changelog.md Changelog.old.md
else
  touch Changelog.old.md
fi
