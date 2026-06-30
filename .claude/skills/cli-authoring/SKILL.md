---
name: cli-authoring
description: Author, build, and distribute the bun-cli CLI baseline. Use when adding or changing CLI commands, cross-compiling the standalone binaries, or wiring up release/publish channels (deb/rpm/apk/brew/docker/nix/GitHub).
---

# CLI Authoring

This template is a working CLI baseline over the AtomiCloud Redis key-value library. It covers
three areas end to end: **framework → build → distribute**. Every per-instance value lives in
one place — `src/config/cli-config.ts` (the config surface). Read that first; never scatter the
binary name, Gemfury account, tap, registry, or target list anywhere else **in TypeScript**.

**Config-surface boundary (FR12/NFC4).** `cli-config.ts` is the single source of truth for the
TypeScript runtime. TS imports `cliConfig` directly; shell scripts read the same object as JSON
through `scripts/config/print-config.ts` + `jq` (the "config bridge" — see `compile.sh`/`fury.sh`).
Declarative files that cannot import TS or run Bun at evaluation time — `.goreleaser.yaml`, the
workflow YAML matrices in `ci.yaml`/`cd.yaml`, `infra/Dockerfile`, `nix/packages.nix`, and the
standalone `scripts/release/install.sh` — restate a small, enumerated subset of these values by
necessity; those are documented, known sync points, not a rule violation. The NFC4 grep is
scoped to TS (`*.ts` under `src/`/`bin/`).

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
- `src/config/cli-config.ts` — the single config surface (FR12).

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

`pls compile` (→ `scripts/release/compile.sh`) cross-compiles every target in
`cliConfig.compileTargets` into `dist/bin/` (or `$COMPILE_OUTDIR`). The five targets:

| target                        | libc  | channel         |
| ----------------------------- | ----- | --------------- |
| `bun-linux-x64-baseline`      | glibc | deb/rpm, docker |
| `bun-linux-arm64`             | glibc | deb/rpm         |
| `bun-darwin-arm64`            | glibc | brew (cask)     |
| `bun-linux-x64-musl-baseline` | musl  | apk             |
| `bun-linux-arm64-musl`        | musl  | apk             |

Both x64 targets use the `-baseline` Bun build (no AVX2 requirement) so the binaries run on
older CPUs **and** under QEMU emulation — which is what lets the x64 rows be smoke-tested
locally/in CI without a native x64 host.

- `pls compile:smoke -- dist/bin/<binary>` runs `--version`/`--help` and asserts the output.
- CI: `⚡reusable-compile.yaml` builds once on Linux and uploads the artifact; the `smoke` matrix
  in `ci.yaml` downloads it and runs `scripts/release/smoke.sh` per target (musl rows run inside a
  stock Alpine image, proving the musl build runs on Alpine).
- `nix build .#bun-cli` builds the binary reproducibly via Nix (deps vendored as a fixed-output
  derivation in `nix/packages.nix`).

To add a target: add it to `cliConfig.compileTargets`, then extend the GoReleaser build ids /
shim mapping (below) and the smoke matrix.

## 3. Distribute — publish channels

`semantic-release` is the **sole owner** of the version, tag, and the GitHub release. On a
`v*.*.*` tag, `.github/workflows/cd.yaml` runs `scripts/release/publish.sh`, which:

1. Compiles the binaries into `prebuilt/`.
2. Runs GoReleaser (`.goreleaser.yaml`, v2). GoReleaser builds the `goreleaser.go` placeholder
   per target, then `scripts/release/goreleaser-shim.sh` swaps in the matching prebuilt Bun
   binary. Two build ids encode the libc split: **glibc → deb/rpm/cask/archives**,
   **musl → apk**. GoReleaser runs with **`release.disable: true`** so it NEVER creates or
   touches a GitHub release — this removes the race where the tag-push that triggers CD could
   beat semantic-release and make GoReleaser create a duplicate release (FR8). The Homebrew
   **cask** still publishes to the tap (GoReleaser deprecated `brews`/formula generation for
   pre-compiled binaries in favour of `homebrew_casks`, so the baseline ships no deprecation
   debt); deb/rpm/apk still build into `dist/`.
3. `scripts/release/fury.sh` pushes the deb/rpm/apk to Gemfury (`push.fury.io/atomicloud`).
4. `scripts/release/github-assets.sh` waits for the semantic-release release to exist, then
   `gh release upload`s the archives, `checksums.txt`, and the one-line `install.sh` onto it
   (this is what makes the documented `…/releases/latest/download/install.sh` URL resolve).
5. The Docker job builds the distroless CLI image (`infra/Dockerfile`).

Dry-run anything without publishing:

```bash
pls release:dry            # = scripts/release/publish.sh --snapshot
# builds archives + deb/rpm/apk + brew cask into dist/, pushes nothing
```

Tokens used in CI: `GITHUB_TOKEN` (release), `FURY_TOKEN` (Gemfury), `SCOOP_BREW_TOKEN` (tap).

Install paths for every channel are documented in [`INSTALLATION.md`](../../../INSTALLATION.md),
including the macOS `xattr` unquarantine caveat (binaries are unsigned).
