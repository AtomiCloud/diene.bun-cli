import type { Command } from 'commander';
import type { IKeyValueStore } from '../../adapters/kv-store';
import { NamespacedKeyValidationError, namespacedKey } from '../../lib/slug';
import { EXIT_ERROR, EXIT_OK } from '../exit-codes';
import type { CliIo } from '../output';

/**
 * Upper bound for `--ttl`, in seconds — one year. Redis rejects absurd expiries server-side,
 * which would otherwise surface as a misleading "failed to reach key-value backend" message;
 * we reject them up front as invalid input instead.
 */
const MAX_TTL_SECONDS = 365 * 24 * 60 * 60;

interface SetOptions {
  /** Optional expiry, in seconds, parsed from the `--ttl` flag. */
  readonly ttl?: string;
}

interface SetDeps {
  readonly store: IKeyValueStore;
  readonly io: CliIo;
}

/**
 * `set <namespace> <key> <value> [--ttl <seconds>]`.
 *
 * Composes the namespaced key through the existing library (`namespacedKey`) and writes it
 * through the injected `IKeyValueStore` (3-layer/DI, FR2).
 * Returns an exit code rather than calling `process.exit`, so it is fully unit-testable.
 */
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
    // Require plain decimal digits so the error text stays honest — `Number()` alone would accept
    // hex (`0x10`) and exponential (`1e2`) notation that the "positive integer" message excludes.
    ttlSeconds = /^\d+$/.test(options.ttl) ? Number(options.ttl) : Number.NaN;
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > MAX_TTL_SECONDS) {
      io.error(
        `invalid input: --ttl must be a positive integer of at most ${MAX_TTL_SECONDS} seconds (got "${options.ttl}")`,
      );
      return EXIT_ERROR;
    }
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
        // Guard close() so a teardown failure (e.g. quit() rejecting when Redis was never
        // reachable) can't throw out of finally and mask the user-friendly error + exit code
        // runSet already produced for that exact failure case.
        try {
          await store.close();
        } catch (closeError) {
          deps.io.error(`failed to close key-value backend cleanly: ${(closeError as Error).message}`);
        }
      }
    });
}
