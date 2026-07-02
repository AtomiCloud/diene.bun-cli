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

- `pls test` — all suites, no coverage (unit + int + sit)
- `pls test:unit`, `pls test:int`, `pls test:sit` — one suite, no coverage
- `pls test:coverage`, `pls test:unit:coverage`, `pls test:int:coverage`,
  `pls test:sit:coverage` — with per-tier coverage
- `pls test:watch` — unit watch mode
- `pls build`
- `pls deadcode`

## Test modes

Suites are split by Bun config so the fast path stays Docker-free:

- **Unit** (`bunfig.unit.toml`, root `tests/unit`) — pure `src/lib` behaviour.
  No containers; this is the default fast path.
- **Integration** (`bunfig.int.toml`, root `tests/integration`) — exercises the
  `src/adapters` boundary against a throwaway Redis container via Testcontainers.
  Slow and Docker-dependent, so it lives on a dedicated path.
- **SIT** (`bunfig.sit.toml`, root `tests/sit`) — the same black-box journeys
  through two drivers: the compiled binary (`pls test:sit`, no coverage) or
  in-process via the glue factory (`pls test:sit:coverage`, `SIT_DRIVER=inprocess`,
  full-system coverage).

The same `tasks/Taskfile.test.yaml` is imported twice from the root `Taskfile.yaml`
(parameterised by `MODE`/`CONFIG`) as the internal `unit:*` and `int:*` namespaces;
the `test:*` root tasks are thin delegations onto them — there is one test recipe,
not two.

Prettier owns formatting. Biome is lint-only. Biome and Knip are declared in
`package.json`, locked by `bun.lock`, and invoked from `./node_modules/.bin` in
pre-commit.

## Coverage gates

- Unit coverage: `coverage/unit/lcov.info` — the `src/lib` domain ledger (100%
  goal).
- Integration coverage: `coverage/int/lcov.info` — the `src/adapters` ledger.
  Each bunfig scopes its ledger via `coveragePathIgnorePatterns` (bun has no
  include mode).
- SIT coverage (in-process driver only): `coverage/sit/lcov.info` — the
  full-system ledger (lib + adapters + glue) under the `sit` codecov flag.
- The local coverage artifact is blocking.
- Codecov upload is non-blocking and split by `unit` / `int` flags.
- `codecov.yml` thresholds are informational by default.

## Build & runtime

- Bun is the application runtime and build target.
- `pls build` (and `scripts/ci/build.sh`) bundle `bin/bun-cli.ts` to
  `dist/bun-cli.js` with `bun build --target bun`.
- `infra/Dockerfile` is a multi-stage Bun image pinned by digest.
- The runtime stage runs as the non-root `bun` user.
- `pls docker:build && pls docker:run` builds and runs the distroless CLI image;
  the entrypoint is the compiled binary, so `docker run` behaves like invoking
  the CLI itself.

## External service / compute cost

- Codecov upload runs only in CI and is best-effort.
- Integration tests and Docker image builds require a Docker runtime.
- Unit, integration, SIT, build, Docker, compile, and smoke are separate CI jobs.

## Template maintenance

`bun-base` is consumed by sibling templates before formal template promotion.
Keep CyanPrint-managed/shared scaffold edits additive. Settings a downstream
template is expected to adapt:

- **Package metadata** — `package.json` `name`/`description`.
- **Coverage thresholds** — `codecov.yml` and any Bun thresholds added later.
- **Docker runtime entrypoint** — `infra/Dockerfile` `ENTRYPOINT`.
- **Badges / template promotion** — the `AtomiCloud/diene.bun-cli` paths in
  `README.md` badges are rewritten on promotion.
- **Sample source/tests** — `src/lib`, `src/adapters`, and the
  matching `tests/` suites are illustrative and replaced per service.

Helm has been dropped from this CLI baseline (a CLI is not a deployed service),
so there is no Helm chart, task file, or CI job. The secret task file
(`tasks/Taskfile.secret.yaml`) is intentionally left untouched by the Bun
baseline — there is no direct Bun dependency on it.

Merge ownership stays manual: CI is driven to green, but the actual merge is a
human action.
