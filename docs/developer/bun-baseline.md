---
id: bun-baseline
title: Bun Baseline
---

# Bun Baseline

`bun-base` is the Bun foundation for `AtomiCloud/diene.bun-cli`. It is a
**sibling-template foundation**: sibling templates copy it and adapt a small set
of settings (see [Template maintenance](#template-maintenance)) before formal
CyanPrint template promotion.

Only Bun-specific baseline behavior is documented here. General standards stay
in `docs/developer/standard/`.

## Local commands

New Bun entries:

- `pls unit`, `pls unit:coverage`, `pls unit:watch`
- `pls int`, `pls int:coverage`, `pls int:watch`
- `pls test`, `pls test:coverage`, `pls test:watch`
- `pls build`
- `pls deadcode`

## Test modes

Two suites are split by Bun config so the fast path stays Docker-free:

- **Unit** (`bunfig.unit.toml`, root `tests/unit`) — pure `src/lib` behaviour.
  No containers; this is the default fast path.
- **Integration** (`bunfig.int.toml`, root `tests/integration`) — exercises the
  `src/adapters` boundary against a throwaway Redis container via Testcontainers.
  Slow and Docker-dependent, so it lives on a dedicated path.

The same `tasks/Taskfile.test.yaml` is imported twice from the root `Taskfile.yaml`
(parameterised by `MODE`/`CONFIG`) to produce the parallel `unit:*` and `int:*`
namespaces — there is one test recipe, not two.

Prettier owns formatting. Biome is lint-only. Biome and Knip are declared in
`package.json`, locked by `bun.lock`, and invoked from `./node_modules/.bin` in
pre-commit.

## Coverage gates

- Unit coverage: `coverage/unit/lcov.info`.
- Integration coverage: `coverage/int/lcov.info`. The integration suite excludes
  `src/cli/**` and `src/lib/**` (covered by the unit suite) via
  `coveragePathIgnorePatterns` in `bunfig.int.toml`.
- The local coverage artifact is blocking.
- Codecov upload is non-blocking and split by `unit` / `int` flags.
- `codecov.yml` thresholds are informational by default.

## Build & runtime

- Bun is the application runtime and build target.
- `pls build` (and `scripts/ci/build.sh`) bundle `bin/bun-cli.ts` to
  `dist/bun-cli.js` with `bun build --target bun`.
- `infra/Dockerfile` is a multi-stage Bun image pinned by digest.
- The runtime stage runs as the non-root `bun` user.
- `pls docker:build && pls docker:run` builds and runs the sample executable; it
  prints the composed sample key by default. When `REDIS_HOST` and `REDIS_PORT`
  are set, the executable uses the Redis adapter to persist and read back a
  sample value.

## External service / compute cost

- Codecov upload runs only in CI and is best-effort.
- Integration tests and Docker image builds require a Docker runtime.
- Unit, integration, build, Docker, compile, and smoke are separate CI jobs.

## Template maintenance

`bun-base` is consumed by sibling templates before formal template promotion.
Keep CyanPrint-managed/shared scaffold edits additive. Settings a downstream
template is expected to adapt:

- **Package metadata** — `package.json` `name`/`description`.
- **Coverage thresholds** — `codecov.yml` and any Bun thresholds added later.
- **Docker runtime entrypoint** — `infra/Dockerfile` `ENTRYPOINT`.
- **Badges / template promotion** — the `AtomiCloud/diene.bun-cli` paths in
  `README.md` badges are rewritten on promotion.
- **Sample source/tests** — `src/lib`, `src/adapters`, `src/cli`, and the
  matching `tests/` suites are illustrative and replaced per service.

Helm has been dropped from this CLI baseline (a CLI is not a deployed service),
so there is no Helm chart, task file, or CI job. The secret task file
(`tasks/Taskfile.secret.yaml`) is intentionally left untouched by the Bun
baseline — there is no direct Bun dependency on it.

Merge ownership stays manual: CI is driven to green, but the actual merge is a
human action.
