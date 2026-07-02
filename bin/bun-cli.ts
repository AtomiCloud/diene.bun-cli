#!/usr/bin/env bun
import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
// ─── DOMAIN WIRING · imports (delete to retarget the CLI; scaffold IO adapters stay — a new domain re-imports them) ───
import { type ICliIo, ConsoleIo } from '../src/adapters/terminal/console-io';
import { CliProgressBar, type IProgressBar } from '../src/adapters/terminal/progress';
import { type IPrompt, InquirerPrompt } from '../src/adapters/terminal/prompt';
import { type ISpinner, OraSpinner } from '../src/adapters/terminal/spinner';
import { BunShell, type IShellRunner } from '../src/adapters/system/shell';
import { DoctorController } from '../src/adapters/kv/api/doctor-controller';
import { GetController } from '../src/adapters/kv/api/get-controller';
import { SeedController } from '../src/adapters/kv/api/seed-controller';
import { SetController } from '../src/adapters/kv/api/set-controller';
import { type RedisConnection, RedisKeyValueStore } from '../src/adapters/kv/data/redis-kv-store';
import type { IKeyValueStore } from '../src/lib/kv/interfaces';
import { DoctorService } from '../src/lib/kv/doctor-service';
import { KvService } from '../src/lib/kv/service';
// ─── end domain imports ───────────────────────────────────────────────────────────────────────

// Per-instance identity (tokenization find/replace lands here): binary name and description.
const BINARY_NAME = 'bun-cli';
const DESCRIPTION = 'Sample CLI baseline over the AtomiCloud Redis key-value library';

/** Scaffold: the commander program skeleton (identity + `--help`/`--version`), domain-free. */
export function createProgram(): Command {
  return new Command()
    .name(BINARY_NAME)
    .description(DESCRIPTION)
    .version(pkg.version, '-v, --version', 'print the CLI version')
    .showHelpAfterError();
}

// ─── DOMAIN WIRING · the ONLY scaffold↔domain seam (delete through END to retarget the CLI) ───────
/** The adapters a CLI invocation needs; the SIT in-process driver injects captured/test doubles here. */
export interface CliWorld {
  readonly store: IKeyValueStore;
  readonly io: ICliIo;
  readonly spinner: ISpinner;
  readonly progress: IProgressBar;
  readonly prompt: IPrompt;
  readonly shell: IShellRunner;
  readonly interactive: boolean;
}

// Sample-domain defaults (the replacement domain brings its own backend defaults).
const REDIS_DEFAULT_HOST = '127.0.0.1';
const REDIS_DEFAULT_PORT = 6379;

/** REDIS_HOST/REDIS_PORT env overrides (needed under docker, where 127.0.0.1 is the container). */
function resolveConnection(): RedisConnection {
  const parsedPort = Number(process.env.REDIS_PORT);
  return {
    host: process.env.REDIS_HOST || REDIS_DEFAULT_HOST,
    port: Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : REDIS_DEFAULT_PORT,
  };
}

/** The real production world: real backend + the shipped IO adapters. */
export function buildWorld(): CliWorld {
  return {
    store: new RedisKeyValueStore(resolveConnection()),
    io: new ConsoleIo(),
    spinner: new OraSpinner(),
    progress: new CliProgressBar(),
    prompt: new InquirerPrompt(),
    shell: new BunShell(),
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  };
}

/** Route the sample domain onto the program — structural typing bridges scaffold ports to domain ports. */
export function registerDomain(program: Command, world: CliWorld): void {
  const kv = new KvService(world.store);
  const doctor = new DoctorService(world.store, world.shell);
  new SetController(kv, world.io).register(program);
  new GetController(kv, world.io, world.prompt, world.interactive).register(program);
  new SeedController(kv, world.io, world.progress).register(program);
  new DoctorController(doctor, world.io, world.spinner).register(program);
}
// ─── END DOMAIN WIRING ────────────────────────────────────────────────────────────────────────

/** Composition root: build the program, wire the domain, run it, and release resources. */
async function execute(argv: string[]): Promise<void> {
  const program = createProgram();
  const cleanups: Array<() => Promise<void>> = [];

  // ─── DOMAIN WIRING · construction (delete these lines to retarget the CLI) ───
  const world = buildWorld();
  registerDomain(program, world);
  cleanups.push(() => world.store.close());
  // ─── end domain construction ───

  try {
    await program.parseAsync(argv);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exitCode = 1;
  } finally {
    // A cleanup failure must not mask the command's own error + exit code.
    for (const cleanup of cleanups) {
      try {
        await cleanup();
      } catch (closeError) {
        process.stderr.write(`failed to release a resource cleanly: ${(closeError as Error).message}\n`);
      }
    }
  }
}

// Guard executable behavior: run only when invoked directly; the SIT in-process driver imports the factory.
if (import.meta.main) {
  await execute(process.argv);
}
