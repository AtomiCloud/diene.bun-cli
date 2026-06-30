<!-- Badge targets point at AtomiCloud/diene.bun-cli and are rewritten on template promotion. -->

[![CI](https://github.com/AtomiCloud/diene.bun-cli/actions/workflows/ci.yaml/badge.svg)](https://github.com/AtomiCloud/diene.bun-cli/actions/workflows/ci.yaml)
[![Coverage](https://codecov.io/gh/AtomiCloud/diene.bun-cli/branch/main/graph/badge.svg)](https://codecov.io/gh/AtomiCloud/diene.bun-cli)
[![Unit Tests](https://img.shields.io/github/check-runs/AtomiCloud/diene.bun-cli/main?nameFilter=Unit%20Tests%20%2F%20Unit%20Tests&label=Unit%20Tests)](https://github.com/AtomiCloud/diene.bun-cli/actions/workflows/ci.yaml)
[![Integration Tests](https://img.shields.io/github/check-runs/AtomiCloud/diene.bun-cli/main?nameFilter=Integration%20Tests%20%2F%20Integration%20Tests&label=Integration%20Tests)](https://github.com/AtomiCloud/diene.bun-cli/actions/workflows/ci.yaml)
[![Commits per month](https://img.shields.io/github/commit-activity/m/AtomiCloud/diene.bun-cli)](https://github.com/AtomiCloud/diene.bun-cli/commits/main)

# Development Environment

All binaries, tools, and PATH are managed by **Nix**. Do not install tools manually or modify PATH outside of the nix configuration.

## Prerequisites

1. **[Nix](https://nixos.org/download)** — package manager
2. **[Docker](https://docs.docker.com/get-docker)** — container runtime
3. **[direnv](https://direnv.net/docs/installation.html)** — auto-loads the nix shell on `cd`

## Getting Started

```bash
direnv allow    # first time only — loads the nix dev shell
```

Once allowed, direnv automatically loads the development environment whenever you enter the project directory.

## Nix Configuration

See [docs/developer/standard/nix.md](docs/developer/standard/nix.md) for the full guide on:

- File structure (`flake.nix`, `nix/`, `.envrc`)
- Adding/removing packages
- Environment groups and shells
- Formatters and pre-commit hooks
- Adding registries

## Bun Baseline

See [docs/developer/bun-baseline.md](docs/developer/bun-baseline.md) for Bun-specific commands, test modes, coverage, and runtime notes.
