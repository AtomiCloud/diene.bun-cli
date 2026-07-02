import { $ } from 'bun';
import type { Command } from 'commander';
import type { IKeyValueStore } from '../../adapters/kv-store';
import { namespacedKey } from '../../lib/slug';
import { EXIT_ERROR, EXIT_OK } from '../exit-codes';
import type { Spinner } from '../feedback';
import type { CliIo } from '../output';

/** Shell boundary, injected so unit tests never spawn a real process. */
export type ShellFn = () => Promise<string>;

/** Real shell call via Bun Shell ($) — zero-dependency, safely escaped. */
export const unameShell: ShellFn = async (): Promise<string> => (await $`uname -srm`.text()).trim();

interface DoctorDeps {
  readonly store: IKeyValueStore;
  readonly io: CliIo;
  readonly spinner: Spinner;
  readonly shell: ShellFn;
}

/** `doctor` — probes the key-value backend (spinner) and reports the platform (shell call). */
export async function runDoctor(deps: DoctorDeps): Promise<number> {
  const { store, io, spinner, shell } = deps;

  try {
    io.success(`platform: ${await shell()}`);
  } catch (error) {
    io.warn(`could not detect platform: ${(error as Error).message}`);
  }

  spinner.start('checking key-value backend ...');
  try {
    const probe = namespacedKey('doctor', 'probe');
    await store.set(probe, 'ok');
    const value = await store.get(probe);
    if (value !== 'ok') {
      spinner.fail('key-value backend returned an unexpected value');
      return EXIT_ERROR;
    }
    spinner.succeed('key-value backend reachable');
    return EXIT_OK;
  } catch (error) {
    spinner.fail(`key-value backend unreachable: ${(error as Error).message}`);
    return EXIT_ERROR;
  }
}

export function registerDoctorCommand(
  program: Command,
  deps: { createStore: () => IKeyValueStore; io: CliIo; spinner: () => Spinner; shell: ShellFn },
): void {
  program
    .command('doctor')
    .description('check the key-value backend and report the platform')
    .action(async () => {
      const store = deps.createStore();
      try {
        process.exitCode = await runDoctor({ store, io: deps.io, spinner: deps.spinner(), shell: deps.shell });
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
