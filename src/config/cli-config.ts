import pkg from '../../package.json' with { type: 'json' };

/** Runtime config; publish/build metadata lives where it is used (.goreleaser.yaml, fury.sh, nix). */

export interface RedisDefaults {
  readonly host: string;
  readonly port: number;
}

export const cliConfig = {
  binaryName: 'bun-cli',
  version: pkg.version,
  description: 'Sample CLI baseline over the AtomiCloud Redis key-value library',
  redis: { host: '127.0.0.1', port: 6379 } satisfies RedisDefaults,
} as const;
