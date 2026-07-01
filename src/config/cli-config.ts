import pkg from '../../package.json' with { type: 'json' };

/**
 * CLI runtime config surface. The single source of truth for the values the CLI reads at runtime;
 * publish/build metadata lives where it is used (.goreleaser.yaml, fury.sh, nix, docker).
 */

/** Default Redis connection used by the sample commands when no override is supplied. */
export interface RedisDefaults {
  readonly host: string;
  readonly port: number;
}

export const cliConfig = {
  /** Installed binary name and the commander program name. */
  binaryName: 'bun-cli',
  /** Version is sourced from package.json so semantic-release stays the single owner. */
  version: pkg.version,
  description: 'Sample CLI baseline over the AtomiCloud Redis key-value library',
  /** Default Redis connection for the sample commands. */
  redis: { host: '127.0.0.1', port: 6379 } satisfies RedisDefaults,
} as const;
