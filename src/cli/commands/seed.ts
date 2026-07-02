import type { Command } from 'commander';
import { z } from 'zod';
import type { IKeyValueStore } from '../../adapters/kv-store';
import { NamespacedKeyValidationError, namespacedKey } from '../../lib/slug';
import { EXIT_ERROR, EXIT_OK } from '../exit-codes';
import type { ProgressBar } from '../feedback';
import type { CliIo } from '../output';

/** Cap seeding so a typo can't hammer the backend. */
const MAX_SEED_COUNT = 10_000;

const CountSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(MAX_SEED_COUNT));

interface SeedDeps {
  readonly store: IKeyValueStore;
  readonly io: CliIo;
  readonly progress: ProgressBar;
}

/** `seed <namespace> <count>` — writes N sample entries with a progress bar. */
export async function runSeed(deps: SeedDeps, namespace: string, count: string): Promise<number> {
  const { store, io, progress } = deps;

  const parsed = CountSchema.safeParse(count);
  if (!parsed.success) {
    io.error(`invalid input: count must be an integer between 1 and ${MAX_SEED_COUNT} (got "${count}")`);
    return EXIT_ERROR;
  }
  const total = parsed.data;

  try {
    progress.start(total);
    for (let i = 1; i <= total; i++) {
      await store.set(namespacedKey(namespace, `sample-${i}`), `value-${i}`);
      progress.tick();
    }
    progress.stop();
    io.success(`seeded ${total} entries under "${namespace}"`);
    return EXIT_OK;
  } catch (error) {
    progress.stop();
    if (error instanceof NamespacedKeyValidationError) {
      io.error(`invalid input: ${error.message}`);
      return EXIT_ERROR;
    }
    io.error(`failed to reach the key-value backend: ${(error as Error).message}`);
    return EXIT_ERROR;
  }
}

export function registerSeedCommand(
  program: Command,
  deps: { createStore: () => IKeyValueStore; io: CliIo; progress: () => ProgressBar },
): void {
  program
    .command('seed')
    .description('write N sample entries under a namespace')
    .argument('<namespace>', 'key namespace')
    .argument('<count>', 'number of entries to write')
    .action(async (namespace: string, count: string) => {
      const store = deps.createStore();
      try {
        process.exitCode = await runSeed({ store, io: deps.io, progress: deps.progress() }, namespace, count);
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
