# Installing `bun-cli`

`bun-cli` ships as a standalone binary (no Bun/Node runtime required) to every major channel.
Pick the one that fits your platform. All per-instance values below (binary name, Gemfury
account `atomicloud`, tap `AtomiCloud/homebrew-tap`) come from the single config surface in
`src/config/cli-config.ts`.

> **macOS caveat — unsigned binaries.** The binaries are not code-signed. On macOS, Gatekeeper
> quarantines them on first run. Clear the quarantine attribute after install:
>
> ```bash
> xattr -d com.apple.quarantine "$(command -v bun-cli)"
> ```

## Debian / Ubuntu (apt, via Gemfury)

```bash
# add the Gemfury apt repository (once)
echo "deb [trusted=yes] https://apt.fury.io/atomicloud/ /" | sudo tee /etc/apt/sources.list.d/atomicloud.list
sudo apt update
sudo apt install bun-cli
```

## Fedora / RHEL / CentOS (yum/dnf, via Gemfury)

```bash
# add the Gemfury yum repository (once)
sudo tee /etc/yum.repos.d/atomicloud.repo <<'EOF'
[atomicloud]
name=AtomiCloud
baseurl=https://yum.fury.io/atomicloud/
enabled=1
gpgcheck=0
EOF
sudo dnf install bun-cli
```

## Alpine (apk, via Gemfury — musl build)

```bash
echo "https://apk.fury.io/atomicloud/" >> /etc/apk/repositories
apk add --allow-untrusted bun-cli
```

> The musl binary links `libstdc++`; the apk package declares it as a dependency, so
> `apk add` pulls it automatically. If you run a raw binary on stock Alpine instead, add it
> yourself: `apk add libstdc++`.

## Homebrew (macOS)

```bash
brew install --cask atomicloud/tap/bun-cli
# AtomiCloud/homebrew-tap — a cask is published on each release
```

> The baseline publishes a Homebrew **cask** (not a formula): GoReleaser deprecated formula
> generation for pre-compiled binaries in favour of casks. The cask strips the macOS quarantine
> attribute on install automatically, so no manual `xattr` step is needed for the brew path.

## Docker

```bash
docker run --rm ghcr.io/atomicloud/diene.bun-cli/diene-bun-cli:latest --help
```

## Nix

```bash
# build from the flake
nix build github:AtomiCloud/diene.bun-cli#bun-cli
./result/bin/bun-cli --version

# or run directly
nix run github:AtomiCloud/diene.bun-cli#bun-cli -- --help
```

## GitHub release (one-line installer)

Downloads the right archive for your OS/arch (glibc or musl), verifies the checksum, and
installs to `~/.local/bin` (override with `BIN_DIR`):

```bash
curl -fsSL https://github.com/AtomiCloud/diene.bun-cli/releases/latest/download/install.sh | bash
```

Or grab a specific archive manually from the
[releases page](https://github.com/AtomiCloud/diene.bun-cli/releases) — `bun-cli_<os>_<arch>.tar.gz`
(glibc) or `bun-cli_linux_<arch>_musl.tar.gz` (musl) — verify it against `checksums.txt`, and
extract the `bun-cli` binary onto your `PATH`.

## Verify

```bash
bun-cli --version
bun-cli --help
```
