---
name: cli-authoring
description: Author, build, and distribute the bun-cli CLI baseline. Use when adding or changing CLI commands, cross-compiling the standalone binaries, or wiring up release/publish channels (deb/rpm/brew/docker/nix/GitHub).
---

# CLI Authoring

This template is a working CLI baseline over the AtomiCloud Redis key-value library. It covers
three areas end to end: **framework → build → distribute**.

`src/config/cli-config.ts` holds the CLI's **runtime** values (binary name, version, description,
Redis defaults). Publish/build metadata lives where it is used: compile targets in
`scripts/release/compile.sh`, the Gemfury endpoint in `scripts/release/fury.sh`, packaging in
`.goreleaser.yaml`, the image in `infra/Dockerfile`, and the standalone `scripts/release/install.sh`.

## 1. Framework — add or change a command

The CLI mirrors the repo's three-layer / DI architecture. The tiers:

- `bin/bun-cli.ts` — executable entry (`#!/usr/bin/env bun`). Thin: builds the program and
  parses argv. The single file `bun build --compile` targets.
- `src/cli/program.ts` — composition root (the guardrail tier). Builds the commander `Command`,
  injects the store factory + IO + prompt into handlers via `ProgramDeps`.
- `src/cli/commands/*.ts` — one file per command. Each exports a pure `runX(deps, ...args)`
  handler returning an exit code, plus a `registerXCommand(program, deps)` that wires it onto
  commander. Handlers depend on `IKeyValueStore` (logic/storage) and `CliIo` (presentation) —
  never on `console`/`chalk`/Redis directly.
- `src/cli/output.ts` — the `CliIo` presentation boundary over `chalk` (success/warn/error).
- `src/config/cli-config.ts` — the CLI runtime config (binary name, version, Redis defaults).

### To add a command `foo`

1. Create `src/cli/commands/foo.ts` with:
   - `export async function runFoo(deps: FooDeps, ...args): Promise<number>` — pure handler,
     returns `EXIT_OK` / `EXIT_ERROR` (import from `src/cli/exit-codes.ts`). Call the library
     (`buildSampleKey` / `namespacedKey`) and the injected store; map domain errors
     (`NamespacedKeyValidationError`, backend failures) to `deps.io.error(...)` + non-zero exit.
   - `export function registerFooCommand(program, deps)` — declares args/options and the action.
2. Register it in `src/cli/program.ts` (`registerFooCommand(program, { ... })`).
3. Add `tests/unit/cli/foo.test.ts` using the fakes in `tests/unit/cli/fakes.ts`
   (`FakeKeyValueStore`, `captureIo`). Assert the store calls, exit code, and rendered output for
   success / validation-error / not-found / unreachable-backend paths. No real Redis.
4. Run `bun test --config=bunfig.unit.toml` (or `pls unit`).

Interactive prompts use inquirer through an injected `PromptFn` so they stay testable and never
hang in CI — guard them behind the `interactive` (TTY) flag and fail fast with a clear message
otherwise (see `get.ts`).

Run locally: `pls cli -- set <ns> <key> <value>` / `pls cli -- get <ns> <key>`.

## 2. Build — standalone binaries

`pls compile` (→ `scripts/release/compile.sh`) cross-compiles every target into `dist/bin/` (or
`$COMPILE_OUTDIR`). The three targets:

| target                   | channel         |
| ------------------------ | --------------- |
| `bun-linux-x64-baseline` | deb/rpm, docker |
| `bun-linux-arm64`        | deb/rpm         |
| `bun-darwin-arm64`       | brew (cask)     |

The x64 target uses the `-baseline` Bun build (no AVX2 requirement) so it runs on older CPUs
**and** under QEMU emulation — which is what lets it be smoke-tested locally/in CI without a
native x64 host.

- `pls compile:smoke -- dist/bin/<binary>` runs `--version`/`--help` and asserts the output.
- CI: `⚡reusable-compile.yaml` builds once on Linux and uploads the artifact; the `smoke` matrix
  in `ci.yaml` downloads it and runs `scripts/release/smoke.sh` per target.
- `nix build .#bun-cli` builds the binary reproducibly via Nix (deps vendored as a fixed-output
  derivation in `nix/packages.nix`).

To add a target: add it to `scripts/release/compile.sh`, add the `goos/goarch` case to
`scripts/release/goreleaser-shim.sh`, and add a row to the smoke matrix.

## 3. Distribute — publish channels

`semantic-release` owns the version, tag, and changelog; **GoReleaser creates the GitHub
release** (mirroring sulfone.iridium). On a `v*.*.*` tag, `.github/workflows/cd.yaml` runs
`scripts/release/publish.sh`, which:

1. Compiles the binaries into `prebuilt/` (survives GoReleaser's `--clean`).
2. Runs GoReleaser (`.goreleaser.yaml`, v2). GoReleaser's own `prebuilt` builder is Pro-only, so
   (like sulfone.iridium) it compiles a trivial Go stub (`goreleaser.go`) into each target slot and
   the post-build hook (`scripts/release/goreleaser-shim.sh`) swaps the real Bun binary from
   `prebuilt/` in over it. GoReleaser then assembles the archives, deb/rpm, Homebrew **cask**
   (`homebrew_casks`, not the deprecated `brews`), and creates the GitHub release carrying the
   archives and checksums. Release notes come from `IncrementalChangelog.md` — this version's
   changelog section (a diff of `Changelog.md` vs `Changelog.old.md`, produced by
   `scripts/release/backup-changelog.sh`).
3. `scripts/release/fury.sh` pushes the deb/rpm to Gemfury (`push.fury.io/atomicloud`).
4. The Docker job builds the distroless CLI image (`infra/Dockerfile`).

Dry-run anything without publishing:

```bash
scripts/release/publish.sh --snapshot
# builds archives + deb/rpm + brew cask into dist/, pushes nothing
```

Tokens used in CI: `GITHUB_TOKEN` (release), `FURY_TOKEN` (Gemfury), `SCOOP_BREW_TOKEN` (tap).

Install paths for every channel are documented in [`INSTALLATION.md`](../../../INSTALLATION.md),
including the macOS `xattr` unquarantine caveat (binaries are unsigned).
