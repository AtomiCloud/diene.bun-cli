# Code Rules

Use these shared standards as the source of truth for AtomiCloud code:

- [Software Design Philosophy](docs/developer/standard/software-design-philosophy/index.md)
- [SOLID Principles](docs/developer/standard/solid-principles/index.md)
- [Functional Practices](docs/developer/standard/functional-practices/index.md)
- [Domain-Driven Design](docs/developer/standard/domain-driven-design/index.md)
- [Three-Layer Architecture](docs/developer/standard/three-layer-architecture/index.md)
- [Stateless OOP and Dependency Injection](docs/developer/standard/stateless-oop-di/index.md)
- [Validation](docs/developer/standard/validation/index.md)
- [Date/Time](docs/developer/standard/datetime/index.md)
- [Testing](docs/developer/standard/testing/index.md)
- [Utilities](docs/developer/standard/utilities/index.md)
- [Contributor Docs](docs/developer/standard/contributor-docs/index.md)
- [Contributor Docs Checklist](docs/developer/standard/contributor-docs/checklist.md)
- [Contributor Docs Classification](docs/developer/standard/contributor-docs/classification.md)
- [Contributor Docs Frontmatter](docs/developer/standard/contributor-docs/frontmatter.md)
- [Contributor Docs Structure](docs/developer/standard/contributor-docs/structure.md)

Only selected language-specific standards are generated. Do not link to missing language docs.

- [TypeScript SOLID Principles](docs/developer/standard/solid-principles/languages/typescript.md)
- [TypeScript Functional Practices](docs/developer/standard/functional-practices/languages/typescript.md)
- [TypeScript Domain-Driven Design](docs/developer/standard/domain-driven-design/languages/typescript.md)
- [TypeScript Stateless OOP and DI](docs/developer/standard/stateless-oop-di/languages/typescript.md)
- [TypeScript Validation](docs/developer/standard/validation/languages/typescript.md)
- [TypeScript Date/Time](docs/developer/standard/datetime/languages/typescript.md)
- [TypeScript Testing](docs/developer/standard/testing/languages/typescript.md)
- [TypeScript Utilities](docs/developer/standard/utilities/languages/typescript.md)

All commits must follow the conventional commits specification. Use `sg` for linting commit messages. See [docs/developer/standard/conventional-commits.md](docs/developer/standard/conventional-commits.md) for details.

# Bun Baseline

See [docs/developer/bun-baseline.md](docs/developer/bun-baseline.md) for Bun-specific commands, test modes, coverage, and runtime notes.

# Development Environment

All binaries, tools, and PATH are managed by **Nix**. Do not install tools manually or modify PATH outside of the nix configuration.

## Prerequisites

1. **Nix** — package manager ([install](https://nixos.org/download))
2. **Docker** — container runtime ([install](https://docs.docker.com/get-docker))
3. **direnv** — auto-loads the nix shell on `cd` ([install](https://direnv.net/docs/installation.html))

## Getting Started

```bash
direnv allow    # first time only — loads the nix dev shell
```

## Nix Configuration

See **[docs/developer/standard/nix.md](docs/developer/standard/nix.md)** for the full guide on:

- File structure (`flake.nix`, `nix/`, `.envrc`)
- Adding/removing packages
- Environment groups and shells
- Formatters and pre-commit hooks
- Adding registries

# Docker

This project uses Docker for containerized builds and deployments. See [docs/developer/standard/docker.md](docs/developer/standard/docker.md) for details.

# Helm

This project uses Helm for Kubernetes chart packaging and deployment. See [docs/developer/standard/helm.md](docs/developer/standard/helm.md) for details.

# Linting

Pre-commit hooks enforce code quality via treefmt, shellcheck, gitlint, and infisical. See [docs/developer/standard/linting.md](docs/developer/standard/linting.md) for details.

# Secret Management

This project uses Infisical for secret management. Use `pls setup` to authenticate
and fetch secrets. See [docs/developer/standard/infisical.md](docs/developer/standard/infisical.md)
for details.

# Semantic Release

This project uses semantic-release for automated versioning. Version bumps are determined by commit types. See [docs/developer/standard/semantic-release.md](docs/developer/standard/semantic-release.md) for details.

# Service Tree

Services are identified by platform and service name. Configuration uses `diene` and `bun-base` variables. See [docs/developer/standard/service-tree.md](docs/developer/standard/service-tree.md) for details.

# Shell Conventions

All shell scripts must start with `#!/usr/bin/env bash` and `set -euo pipefail`. See [docs/developer/standard/shell-scripts.md](docs/developer/standard/shell-scripts.md) for details.

# Taskfile Conventions

Use `pls setup` to set up the repository and `pls lint` to run pre-commit hooks. See [docs/developer/standard/taskfile.md](docs/developer/standard/taskfile.md) for details.
