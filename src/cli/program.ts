import { Command } from 'commander';
import type { IKeyValueStore, RedisConnection } from '../adapters/kv-store';
import { cliConfig } from '../config/cli-config';
import { createRedisStore } from '../index';
import { type PromptFn, inquirerPrompt, registerGetCommand } from './commands/get';
import { registerSetCommand } from './commands/set';
import { type CliIo, consoleIo } from './output';

/**
 * CLI composition layer (the guardrail tier, mirroring `src/index.ts`'s DI).
 *
 * Builds the commander program and injects the store factory + IO + prompt into the command
 * handlers. Everything the handlers touch is a dependency, so the whole CLI is constructed
 * here and exercised with fakes in unit tests.
 */
export interface ProgramDeps {
  /** Factory for the key-value store the commands write/read through. */
  readonly createStore: (connection: RedisConnection) => IKeyValueStore;
  /** Connection the store is built against (from the config surface). */
  readonly connection: RedisConnection;
  /** Output sink (colour formatting). */
  readonly io: CliIo;
  /** Interactive prompt for missing arguments. */
  readonly prompt: PromptFn;
  /** Whether the process is attached to an interactive TTY. */
  readonly interactive: boolean;
}

/** Real dependencies wired against Redis, the console, and inquirer. */
const defaultProgramDeps: ProgramDeps = {
  createStore: createRedisStore,
  connection: { host: cliConfig.redis.host, port: cliConfig.redis.port },
  io: consoleIo,
  prompt: inquirerPrompt,
  interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
};

export function buildProgram(deps: ProgramDeps = defaultProgramDeps): Command {
  const program = new Command();
  program
    .name(cliConfig.binaryName)
    .description(cliConfig.description)
    .version(cliConfig.version, '-v, --version', 'print the CLI version')
    .showHelpAfterError();

  const createStore = (): IKeyValueStore => deps.createStore(deps.connection);

  registerSetCommand(program, { createStore, io: deps.io });
  registerGetCommand(program, {
    createStore,
    io: deps.io,
    prompt: deps.prompt,
    interactive: deps.interactive,
  });

  return program;
}
