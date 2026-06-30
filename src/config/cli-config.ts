import pkg from '../../package.json' with { type: 'json' };

/**
 * Single config surface (FR12) — scope and boundary.
 *
 * This module is the single source of truth for every per-instance value **within the
 * TypeScript runtime**: the CLI, and any shell that can shell out to Bun, read these values
 * from here and ONLY here. Concretely:
 *
 *   - TypeScript (`src/`, `bin/`) imports `cliConfig` directly — never re-declare a literal.
 *   - Shell scripts (`scripts/release/*.sh`) read the SAME object as JSON via
 *     `scripts/config/print-config.ts` + `jq` (the "config bridge"), so there is exactly
 *     one source of truth across TS and shell. See `compile.sh`/`fury.sh` for the pattern.
 *
 * What is intentionally OUTSIDE this scope: declarative files that cannot import TypeScript or
 * shell out to Bun at evaluation time — `.goreleaser.yaml`, the GitHub Actions workflow YAML
 * (`ci.yaml`/`cd.yaml` matrices), `infra/Dockerfile`, `nix/packages.nix`, and the standalone
 * `scripts/release/install.sh` (which runs on a machine with no Bun). These each restate a
 * small subset of these values out of necessity; they are documented, known sync points, NOT
 * a violation of the single-surface rule. The NFC4 grep is therefore scoped to TS
 * (`*.ts` under `src/`/`bin/`): no per-instance literal may be hardcoded in TypeScript outside
 * this file. Tokenizing for CyanPrint later is still a find/replace, just across the config
 * module plus that fixed, enumerated set of declarative files.
 */

/** A single `bun build --compile` target and how it maps onto package/artifact naming. */
interface CompileTarget {
  /** The value passed to `bun build --compile --target=<bunTarget>`. */
  readonly bunTarget: string;
  /** Stable artifact filename under `dist/bin/` (no extension). */
  readonly artifact: string;
  readonly os: 'linux' | 'darwin';
  readonly arch: 'x64' | 'arm64';
  /** C library variant — drives the GoReleaser nfpm packager split (glibc → deb/rpm, musl → apk). */
  readonly libc: 'glibc' | 'musl';
}

/** Default Redis connection used by the sample commands when no override is supplied. */
export interface RedisDefaults {
  readonly host: string;
  readonly port: number;
}

/** The five standalone targets the CLI ships (FR4). */
const compileTargets: readonly CompileTarget[] = [
  {
    bunTarget: 'bun-linux-x64-baseline',
    artifact: 'bun-cli-linux-x64-baseline',
    os: 'linux',
    arch: 'x64',
    libc: 'glibc',
  },
  { bunTarget: 'bun-linux-arm64', artifact: 'bun-cli-linux-arm64', os: 'linux', arch: 'arm64', libc: 'glibc' },
  { bunTarget: 'bun-darwin-arm64', artifact: 'bun-cli-darwin-arm64', os: 'darwin', arch: 'arm64', libc: 'glibc' },
  // x64 ships the `-baseline` build (both glibc and musl) for maximum CPU compatibility — no
  // AVX2 requirement — which also lets the binary run under QEMU emulation for local/CI smoke
  // tests (non-baseline x64 Bun builds SIGILL under emulation). The artifact name keeps the
  // plain `-musl` suffix so the GoReleaser shim + archive naming stay stable.
  {
    bunTarget: 'bun-linux-x64-musl-baseline',
    artifact: 'bun-cli-linux-x64-musl',
    os: 'linux',
    arch: 'x64',
    libc: 'musl',
  },
  { bunTarget: 'bun-linux-arm64-musl', artifact: 'bun-cli-linux-arm64-musl', os: 'linux', arch: 'arm64', libc: 'musl' },
] as const;

export const cliConfig = {
  // ── CLI identity ──────────────────────────────────────────────────────────
  /** Installed binary name and the commander program name. */
  binaryName: 'bun-cli',
  /** Version is sourced from package.json so semantic-release stays the single owner. */
  version: pkg.version,
  description: 'Sample CLI baseline over the AtomiCloud Redis key-value library',

  // ── Publish channels ──────────────────────────────────────────────────────
  /** Gemfury account that backs the apt/yum/apk repositories. */
  gemfuryAccount: 'atomicloud',
  /** Gemfury push endpoint for deb/rpm/apk uploads (token: FURY_TOKEN). */
  pushEndpoint: 'push.fury.io/atomicloud',
  /** Homebrew tap repository the brew formula is committed to (token: SCOOP_BREW_TOKEN). */
  homebrewTap: 'AtomiCloud/homebrew-tap',
  /** Container registry and image name for the CLI-binary Docker image. */
  dockerRegistry: 'ghcr.io',
  imageName: 'diene-bun-cli',
  /** Nix package output name (`nix build .#<nixPackageName>`). */
  nixPackageName: 'bun-cli',

  // ── Build ─────────────────────────────────────────────────────────────────
  compileTargets,

  // ── Runtime defaults ────────────────────────────────────────────────────────
  redis: { host: '127.0.0.1', port: 6379 } satisfies RedisDefaults,
} as const;
