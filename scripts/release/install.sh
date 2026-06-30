#!/usr/bin/env bash
set -euo pipefail

# One-line installer served from the GitHub release (FR7/FR10):
#   curl -fsSL https://github.com/AtomiCloud/diene.bun-cli/releases/latest/download/install.sh | bash
#
# Detects os/arch (and glibc vs musl), downloads the matching archive + checksums.txt from the
# release, verifies the checksum, and installs the binary to BIN_DIR (default: ~/.local/bin).
#
# These identity values mirror src/config/cli-config.ts; this script is standalone (no Bun at
# install time) so it carries its own copy. Keep them in sync with the config surface.
REPO="AtomiCloud/diene.bun-cli"
BINARY="bun-cli"

VERSION="${VERSION:-latest}"
BIN_DIR="${BIN_DIR:-${HOME}/.local/bin}"

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "${os}" in
linux | darwin) ;;
*)
  echo "❌ unsupported OS: ${os}" >&2
  exit 1
  ;;
esac

case "$(uname -m)" in
x86_64 | amd64) arch="amd64" ;;
aarch64 | arm64) arch="arm64" ;;
*)
  echo "❌ unsupported architecture: $(uname -m)" >&2
  exit 1
  ;;
esac

# musl suffix only applies on Linux libcs that are musl (e.g. Alpine).
suffix=""
if [[ ${os} == "linux" ]] && (ldd --version 2>&1 | grep -qi musl || [[ -f /etc/alpine-release ]]); then
  suffix="_musl"
fi

archive="${BINARY}_${os}_${arch}${suffix}.tar.gz"

if [[ ${VERSION} == "latest" ]]; then
  base="https://github.com/${REPO}/releases/latest/download"
else
  base="https://github.com/${REPO}/releases/download/${VERSION}"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "${tmp}"' EXIT

echo "⬇️  downloading ${archive} ..."
curl -fsSL "${base}/${archive}" -o "${tmp}/${archive}"
curl -fsSL "${base}/checksums.txt" -o "${tmp}/checksums.txt"

echo "🔐 verifying checksum ..."
(
  cd "${tmp}"
  expected="$(grep " ${archive}\$" checksums.txt | awk '{print $1}')"
  [[ -n ${expected} ]] || {
    echo "❌ no checksum entry for ${archive}" >&2
    exit 1
  }
  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s  %s\n' "${expected}" "${archive}" | sha256sum -c -
  else
    actual="$(shasum -a 256 "${archive}" | awk '{print $1}')"
    [[ ${actual} == "${expected}" ]] || {
      echo "❌ checksum mismatch" >&2
      exit 1
    }
  fi
)

echo "📦 installing to ${BIN_DIR} ..."
mkdir -p "${BIN_DIR}"
tar -xzf "${tmp}/${archive}" -C "${tmp}"
install -m 0755 "${tmp}/${BINARY}" "${BIN_DIR}/${BINARY}"

echo "✅ installed ${BINARY} to ${BIN_DIR}/${BINARY}"
echo "📝 ensure ${BIN_DIR} is on your PATH."
if [[ -n ${suffix} ]]; then
  echo "📝 note: the musl build needs libstdc++ — on Alpine run 'apk add libstdc++'."
fi
