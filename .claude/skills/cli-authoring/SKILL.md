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

## 1. Framework — a CLI is the three-layer architecture

A CLI is just an API-layer type (see the three-layer skill: `CLI: parse args → domain → exit
code`). Commander is imperative, so its imperativeness is quarantined in exactly two places: the
composition root and each controller's `register()`. Everything is a class with constructor
injection (stateless-oop-di) — no free-function handlers, no ad-hoc deps objects.

- `bin/bun-cli.ts` — **the composition root ("big bang")**. `main()` constructs the ENTIRE world
  once — adapters → domain services → controllers → commander program — then `parseAsync`. The
  store is opened and closed here, not per command. This is the only place `new` is called.
- `src/lib/kv/` — **domain layer (zero IO)**: `slug.ts` (pure logic + domain errors),
  `interfaces.ts` (the ports the domain defines: `IKeyValueStore`, `IProgressReporter`,
  `IShell`), `service.ts` (`KvService`) and `doctor-service.ts` — stateless classes over the
  ports.
- `src/adapters/kv/api/` — **controllers**: one class per command (`SetController`, …). A
  controller does ONLY guardrail work: zod-validate the raw args (`validator.ts`), route to the
  pre-built service, map domain errors → `io` messages + exit code (`exit-codes.ts`).
  `register(program)` declares the commander route whose action just calls `this.handle(...)`.
- `src/adapters/kv/data/` — `RedisKeyValueStore` implements the domain's `IKeyValueStore`.
- `src/adapters/terminal/` — presentation adapters, all classes: `ConsoleIo` (chalk),
  `OraSpinner` (ora), `CliProgressBar` (cli-progress), `InquirerPrompt` (inquirer).
- `src/adapters/system/` — `BunShell` implements `IShell` via Bun Shell (`$`, zero-dependency).
- `src/config/cli-config.ts` — the CLI runtime config (binary name, version, Redis defaults),
  read only by the composition root.

### To add a command `foo`

1. Domain first: add the logic to an existing service in `src/lib/kv/` (or a new stateless
   service class) — zero IO, dependencies only via constructor-injected ports from
   `interfaces.ts`.
2. Create `src/adapters/kv/api/foo-controller.ts`: a class taking the service + presentation
   ports in its constructor, a `register(program)` that declares the route, and a public
   `handle(...): Promise<number>` that validates (zod in `validator.ts`), routes, and maps
   errors to `EXIT_OK`/`EXIT_ERROR`.
3. Wire it in `bin/bun-cli.ts`'s `main()`: `new FooController(service, io).register(program);`.
4. Add `tests/unit/kv/foo-controller.test.ts` using the fakes in `tests/unit/kv/fakes.ts` —
   assert store calls, exit codes, and rendered output for success / validation-error /
   unreachable-backend paths. No real Redis; `register()` is covered by SIT, not unit tests.
5. Run `pls unit`, then `pls sit` for the black-box journey.

Interactive prompts go through the injected `IPrompt` and are guarded by the `interactive`
(TTY) flag resolved in main — never prompt off a TTY, fail fast instead (see `GetController`).

Try it locally: `pls up` (dependencies) → `pls run -- set <ns> <key> <value>` (dev mode) or
`pls compile && pls run:bin -- doctor` (compiled binary) → `pls down`.

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
- `pls sit` (→ `tests/sit/cli.sit.test.ts`) is the black-box tier per the testing standard:
  every command journeyed through the compiled binary against a real Redis (regression
  invariants, no coverage). CI runs it after compile via `⚡reusable-sit.yaml`.
- CI: `⚡reusable-compile.yaml` builds once on Linux and uploads the artifact; the `smoke` matrix
  in `ci.yaml` downloads it and runs `scripts/release/smoke.sh` per target.
- `nix build .#bun-cli` builds the binary reproducibly via Nix (deps vendored as a fixed-output
  derivation in `nix/packages.nix`). **When dependencies change**, the pinned `outputHash` there
  goes stale — set it to `pkgs.lib.fakeHash`, build, and copy the real hash from the error.

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
