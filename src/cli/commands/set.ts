import type { Command } from 'commander';
import { z } from 'zod';
import type { IKeyValueStore } from '../../adapters/kv-store';
import { NamespacedKeyValidationError, namespacedKey } from '../../lib/slug';
import { EXIT_ERROR, EXIT_OK } from '../exit-codes';
import type { CliIo } from '../output';

/** One-year --ttl cap: reject absurd expiries up front instead of a misleading backend error. */
const MAX_TTL_SECONDS = 365 * 24 * 60 * 60;

/** Decimal digits only — `Number()` alone would accept hex/exponential the error text excludes. */
const TtlSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(MAX_TTL_SECONDS));

interface SetOptions {
  /** Optional expiry, in seconds, parsed from the `--ttl` flag. */
  readonly ttl?: string;
}

interface SetDeps {
  readonly store: IKeyValueStore;
  readonly io: CliIo;
}

/** `set <namespace> <key> <value> [--ttl <seconds>]` — returns an exit code, never calls process.exit. */
export async function runSet(
  deps: SetDeps,
  namespace: string,
  key: string,
  value: string,
  options: SetOptions = {},
): Promise<number> {
  const { store, io } = deps;

  let ttlSeconds: number | undefined;
  if (options.ttl !== undefined) {
    const parsed = TtlSchema.safeParse(options.ttl);
    if (!parsed.success) {
      io.error(
        `invalid input: --ttl must be a positive integer of at most ${MAX_TTL_SECONDS} seconds (got "${options.ttl}")`,
      );
      return EXIT_ERROR;
    }
    ttlSeconds = parsed.data;
  }

  let composed: string;
  try {
    composed = namespacedKey(namespace, key);
  } catch (error) {
    if (error instanceof NamespacedKeyValidationError) {
      io.error(`invalid input: ${error.message}`);
      return EXIT_ERROR;
    }
    throw error;
  }

  try {
    await store.set(composed, value, ttlSeconds);
  } catch (error) {
    io.error(`failed to reach key-value backend: ${(error as Error).message}`);
    return EXIT_ERROR;
  }

  const ttlNote = ttlSeconds === undefined ? '' : ` (expires in ${ttlSeconds}s)`;
  io.success(`set ${composed} = ${value}${ttlNote}`);
  return EXIT_OK;
}

/** Wires the `set` command onto the commander program, constructing a store per invocation. */
export function registerSetCommand(program: Command, deps: { createStore: () => IKeyValueStore; io: CliIo }): void {
  program
    .command('set')
    .description('store a value under a namespaced key')
    .argument('<namespace>', 'key namespace')
    .argument('<key>', 'key name')
    .argument('<value>', 'value to store')
    .option('--ttl <seconds>', 'expire the entry after the given number of seconds')
    .action(async (namespace: string, key: string, value: string, options: SetOptions) => {
      const store = deps.createStore();
      try {
        process.exitCode = await runSet({ store, io: deps.io }, namespace, key, value, options);
      } finally {
        // A close() failure must not mask the command's own error + exit code.
        try {
          await store.close();
        } catch (closeError) {
          deps.io.error(`failed to close key-value backend cleanly: ${(closeError as Error).message}`);
        }
      }
    });
}
