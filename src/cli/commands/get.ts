import type { Command } from 'commander';
import inquirer from 'inquirer';
import type { IKeyValueStore } from '../../adapters/kv-store';
import { buildSampleKey } from '../../index';
import { NamespacedKeyValidationError } from '../../lib/slug';
import { EXIT_ERROR, EXIT_OK } from '../exit-codes';
import type { CliIo } from '../output';

/** Signature for the interactive prompt, injected so handlers stay unit-testable. */
export type PromptFn = (message: string) => Promise<string>;

interface GetDeps {
  readonly store: IKeyValueStore;
  readonly io: CliIo;
  /** Prompts for a missing argument in an interactive terminal. */
  readonly prompt: PromptFn;
  /** Whether stdin/stdout are an interactive TTY (false in CI → never hang). */
  readonly interactive: boolean;
}

/**
 * The single contrived inquirer interaction (FR1): prompt for one missing argument.
 */
export const inquirerPrompt: PromptFn = async (message: string): Promise<string> => {
  const { answer } = await inquirer.prompt<{ answer: string }>([{ type: 'input', name: 'answer', message }]);
  return answer;
};

/**
 * `get <namespace> [key]`.
 *
 * Reads through the injected `IKeyValueStore`. When `key` is omitted it prompts via inquirer
 * in an interactive TTY, and fails fast with a clear message in non-interactive contexts (CI)
 * so it never hangs. Prints the value, or a yellow "not found" with a non-zero exit.
 */
export async function runGet(deps: GetDeps, namespace: string, key?: string): Promise<number> {
  const { store, io, prompt, interactive } = deps;

  let resolvedKey = key;
  if (resolvedKey === undefined || resolvedKey === '') {
    if (!interactive) {
      io.error('missing argument: key (pass <key> or run in an interactive terminal)');
      return EXIT_ERROR;
    }
    resolvedKey = await prompt('key');
  }

  let composed: string;
  try {
    composed = buildSampleKey(namespace, resolvedKey);
  } catch (error) {
    if (error instanceof NamespacedKeyValidationError) {
      io.error(`invalid input: ${error.message}`);
      return EXIT_ERROR;
    }
    throw error;
  }

  let value: string | null;
  try {
    value = await store.get(composed);
  } catch (error) {
    io.error(`failed to reach key-value backend: ${(error as Error).message}`);
    return EXIT_ERROR;
  }

  if (value === null) {
    io.warn(`not found: ${composed}`);
    return EXIT_ERROR;
  }

  io.success(value);
  return EXIT_OK;
}

/** Wires the `get` command onto the commander program, constructing a store per invocation. */
export function registerGetCommand(
  program: Command,
  deps: { createStore: () => IKeyValueStore; io: CliIo; prompt: PromptFn; interactive: boolean },
): void {
  program
    .command('get')
    .description('read a value by namespaced key')
    .argument('<namespace>', 'key namespace')
    .argument('[key]', 'key name (prompted interactively when omitted)')
    .action(async (namespace: string, key: string | undefined) => {
      const store = deps.createStore();
      try {
        process.exitCode = await runGet(
          { store, io: deps.io, prompt: deps.prompt, interactive: deps.interactive },
          namespace,
          key,
        );
      } finally {
        await store.close();
      }
    });
}
