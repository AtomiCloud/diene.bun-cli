---
id: ci-cd
title: CI/CD Workflows
---

# CI/CD Workflows

This document describes the principles and patterns for CI/CD workflows in the workspace template.

## Architecture Overview

The CI/CD architecture is designed around three core principles:

1. **Local reproducibility** - All CI scripts must be runnable locally
2. **Separation of concerns** - GitHub Actions is just a task runner; logic lives in shell scripts
3. **Reusable patterns** - Abstract complexity into reusable workflows

## Three Workflow Types

| Workflow    | Trigger                          | Purpose                                    |
| ----------- | -------------------------------- | ------------------------------------------ |
| **CI**      | Every commit                     | Gates and checks that must pass regardless |
| **Release** | Merge to main (after CI success) | Semantic versioning, changelog, git tag    |
| **CD**      | New version (tag push)           | Deploy artifacts                           |

### CI Workflow

Runs on every commit to verify code quality. Example jobs might include:

- Pre-commit hooks (linting, formatting)
- Unit tests
- Integration tests
- Builds

### Release Workflow

Runs only after successful CI on main branch. Handles:

- Semantic versioning based on commit types
- Changelog generation
- Git tag creation
- GitHub release creation

### CD Workflow

Runs when a new version tag is pushed. Handles deployment operations.

### Artifact Publishing Model (Docker & CLI binaries)

This repo is a **CLI baseline** — it publishes a Docker image and standalone CLI binaries
(deb/rpm/brew/GitHub release/Nix). Helm has been dropped (a CLI is not a deployed service),
so there is no chart, `⚡reusable-helm.yaml`, or `scripts/ci/helm.sh`.

| Trigger          | When                       | What happens                                                                                         |
| ---------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| **CI** (commit)  | Every push                 | Build & push the Docker image (cached); cross-compile every CLI binary and smoke-test it per target  |
| **CD** (release) | `v*.*.*` tag (sem-release) | Re-tag the image at the version; `scripts/release/publish.sh` packages + publishes every CLI channel |

Key properties:

- The Docker logic lives in `./scripts/ci/docker.sh [version]` (`⚡reusable-docker.yaml`). The
  binary pipeline lives in `scripts/release/compile.sh` (cross-compile) + `scripts/release/smoke.sh`
  (`⚡reusable-compile.yaml` / `⚡reusable-smoke.yaml`), and `scripts/release/publish.sh` packages
  and publishes on the release tag.
- Release ownership: **semantic-release owns the version, tag, and changelog**; GoReleaser then
  creates the GitHub release with the archives/checksums and publishes the Homebrew cask.
- Setup uses the shared AtomiCloud actions — `AtomiCloud/actions.setup-docker` for Docker and
  `AtomiCloud/actions.setup-nix` for the Nix-backed jobs. Do **not** call the underlying
  nscloud/buildx actions directly.
- All Nix jobs (pre-commit, compile, release) share the same Nix store cache via
  `nscloud-cache-tag-atomi-nix-store-cache`.
- There is **no cap** on the number of images or compile targets — add a caller job per
  `image_name`, or a new target to `scripts/release/compile.sh` (+ the matching
  `goreleaser-shim.sh` case and smoke-matrix row).

### Dev Shells

| Shell        | Used by                                  |
| ------------ | ---------------------------------------- |
| `.#ci`       | CI checks (pre-commit, compile)          |
| `.#cd`       | CD (Docker / Nix-backed deploy steps)    |
| `.#releaser` | Semantic release + GoReleaser publishing |

## The Execution Pattern

```
Setup Nix -> Setup Caches -> nix develop -c ./scripts/ci/script.sh
```

**Why this pattern?**

- GitHub Actions is just a task runner
- Real logic lives in shell scripts
- Shell scripts run in Nix = **local reproducibility**
- You can run CI locally: `nix develop .#ci -c ./scripts/ci/script.sh`

### Example Execution

```yaml
- uses: AtomiCloud/actions.setup-nix@v3 # checks out the repo too
- run: nix develop .#ci -c ./scripts/ci/script.sh
```

## Reusable Workflow Conventions

### Naming

- Reusable workflows are named with `⚡` emoji prefix
- Format: `⚡reusable-{purpose}.yaml`
- Examples: `⚡reusable-precommit.yaml`, `⚡reusable-test.yaml`

### Separation of Responsibilities

**Caller workflow is responsible for:**

- Defining the trigger
- Wiring only the inputs the reusable workflow actually needs
- Choosing which reusable workflow to invoke

**Reusable workflow is responsible for:**

- Setup (`AtomiCloud/actions.setup-nix@v3` or `AtomiCloud/actions.setup-docker@v2`)
- Running the shell script from `scripts/ci/` (or, for the CLI-binary compile/smoke pipeline,
  the standalone-binary scripts under `scripts/release/` — `⚡reusable-compile.yaml` runs
  `scripts/release/compile.sh` and `⚡reusable-smoke.yaml` runs `scripts/release/smoke.sh`
  directly; CI shells lack `pls`, so workflows always call scripts, never task names)

### Inputs: only when required

Reusable workflows declare an input **only if they use it**. Cache keys no longer depend on
platform/service, so `atomi_platform` / `atomi_service` are **not** required inputs — pre-commit,
compile, and release take no inputs, `⚡reusable-docker.yaml` takes `image_name`/`dockerfile`/…, and
`⚡reusable-smoke.yaml` takes `binary`/`runs_on`.

### Example: Reusable Workflow Structure

```yaml
# .github/workflows/⚡reusable-precommit.yaml
name: Reusable Pre-Commit

on:
  workflow_call:

jobs:
  precommit:
    runs-on:
      - nscloud-ubuntu-22.04-amd64-4x8-with-cache
      - nscloud-cache-size-50gb
      - nscloud-cache-tag-atomi-nix-store-cache
    steps:
      - uses: AtomiCloud/actions.setup-nix@v3 # checks out the repo too
      - run: nix develop .#ci -c ./scripts/ci/pre-commit.sh
```

<!-- prettier-ignore -->
```yaml
# .github/workflows/ci.yaml (caller)
name: CI

on:
  push:

jobs:
  precommit:
    uses: ./.github/workflows/⚡reusable-precommit.yaml
    secrets: inherit
```

## Infrastructure and Caching

### NS-Cloud Runners

Runners with Nix store caching for persistent build artifacts.

### Shared Nix Store Cache

All Nix jobs use a single shared cache tag — **not** per-service — so the whole org reuses one
warm store and saves cache space:

```yaml
nscloud-cache-tag-atomi-nix-store-cache
```

## Local Reproducibility

All CI scripts MUST be runnable locally:

```bash
nix develop .#ci -c ./scripts/ci/script.sh
```

This allows developers to:

- Debug CI failures locally
- Run checks without pushing
- Verify changes before committing

## Directory Structure

```
.github/
└── workflows/
    ├── ci.yaml                    # Main CI workflow
    ├── release.yaml               # Release workflow
    ├── cd.yaml                    # Deploy workflow
    ├── ⚡reusable-precommit.yaml  # Reusable pre-commit
    ├── ⚡reusable-test.yaml       # Reusable test (example)
    └── ⚡reusable-build.yaml      # Reusable build (example)

scripts/
└── ci/
    ├── pre-commit.sh              # CI: pre-commit hooks
    ├── test.sh                    # CI: tests (unit|int|sit)
    └── build.sh                   # CI: build
```

## Summary

| Aspect                    | Pattern                                                     |
| ------------------------- | ----------------------------------------------------------- |
| **Workflow types**        | CI (every commit), Release (main merge), CD (tag push)      |
| **Execution**             | Nix -> Caches -> shell script                               |
| **Reusable workflows**    | Named with `⚡`, reusable workflow handles execution        |
| **Cache tag (shared)**    | `atomi-nix-store-cache` (one shared store, not per-service) |
| **Local reproducibility** | `nix develop .#ci -c ./scripts/ci/script.sh`                |
