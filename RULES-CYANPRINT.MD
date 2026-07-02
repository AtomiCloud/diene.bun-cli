# RULES-CYANPRINT

Generalized rules distilled from the bun-cli baseline review. Each touches **shared/upstream
surface** (bun-base, the standards docs, or every derived template) and should be propagated via
CyanPrint / a bun-base pass rather than patched per-repo.

## Taskfile & scripts

- **`scripts/ci/*` are CI workflow entry points only.** Every CI entry script is self-contained:
  it installs its own dependencies by calling `scripts/ci/setup.sh` first (build/test/pre-commit/
  compile all do). Jobs never assume a warm environment.
- **Taskfiles never call `scripts/ci/*`.** Local tasks use inline one-liners or
  `scripts/local/*` helpers — `pls setup` runs `scripts/local/setup.sh` (+ `secrets.sh`).
- **Standard task names:** `pls run -- <args>` (dev-mode invocation), `pls run:bin -- <args>`
  (this host's compiled binary), `pls up` / `pls down` (start/stop ALL local dependencies,
  detached). A CLI template prefers detached up/down over a foreground `dev` — the terminal is
  needed to invoke the CLI.

## Shell style

- **Linear scripts, no functions** (no `die()` helpers). Guard with the one-liner shape:

  ```bash
  [ -n "${GITHUB_TOKEN:-}" ] || {
    echo "❌ 'GITHUB_TOKEN' env var not set" >&2
    exit 1
  }
  ```

  Never `[ -z "$X" ] && echo … && exit 1` inside a `set -e` script — when the check passes the
  list returns 1 and `set -e` kills the script.
- Scripts start `#!/usr/bin/env bash` + `set -euo pipefail`, echo progress with emoji, and end
  with a `✅` success echo.
- **Comments: at most one line stating a non-obvious why.** No narration blocks anywhere
  (shell, TS, yaml, nix, Dockerfiles).

## Releases & versioning

- **`sg release -i npm` mutates package.json** (ephemeral plugin installs). Any semantic-release
  step that commits package.json must first `git checkout HEAD -- package.json`, then stamp via
  `bun pm pkg set version=…` — a version-only edit that bun.lock does not pin, so the lockfile is
  never regenerated and pins cannot drift.
- **Binary-shipping repos:** GoReleaser owns the GitHub release (semantic-release keeps
  version/tag/changelog; release notes via `--release-notes` on the changelog diff). Library
  repos keep `@semantic-release/github`. GoReleaser's `prebuilt` builder is Pro-only — non-Go
  binaries use the Go-stub + post-build shim (mirrors sulfone.iridium).
- Anything served from the GitHub release (e.g. `install.sh`) must be uploaded via
  `release.extra_files` — nothing uploads it implicitly.
- npm publish secrets are named **`NPM_API_KEY`** (workflow declaration and env mapping).

## Testing

- Tests use `bun:test` + the **`should`** assertion library, explicit `// Arrange` / `// Act` /
  `// Assert` comments, and `subject`/`actual`/`expected`/`input` naming.
- **Coverage is scoped per tier** (bun has no include mode — scope by excluding): the unit
  ledger measures the domain (100% goal) via `coveragePathIgnorePatterns`; add `tests/**` so
  helper fakes never appear; integration measures the data adapter; SIT and smoke are
  black-box (no coverage).
- **Every feature gets a SIT journey** — black-box through the compiled artifact against real
  dependencies (regression invariants); smoke only proves the artifact executes per platform.

## Architecture

- **Apps are the three-layer architecture with a composition root.** A CLI is an API-layer type
  (parse args → domain → exit code): `main()` constructs the whole object graph once (the "big
  bang" — the only place `new` is called) and owns resource lifecycles; commands are controller
  classes that only validate (zod), route to pre-built services, and map errors to exit codes;
  spinners, progress bars, prompts, io, and shell are ALL adapters implementing domain-defined
  ports. No free-function handlers or ad-hoc deps objects. Framework imperativeness (commander)
  is confined to main + `register()`.

## Meta

- `.cyan_state.yaml` is not hand-maintained — do not add/remove entries manually.
- User-input validation at the API boundary goes through zod schemas, not manual `Number()`
  checks (digit-regex piped to int/min/max keeps hex/exponential rejected).
