#!/usr/bin/env bun
import { Command } from 'commander';
import { DoctorController } from '../src/adapters/kv/api/doctor-controller';
import { GetController } from '../src/adapters/kv/api/get-controller';
import { SeedController } from '../src/adapters/kv/api/seed-controller';
import { SetController } from '../src/adapters/kv/api/set-controller';
import { type RedisConnection, RedisKeyValueStore } from '../src/adapters/kv/data/redis-kv-store';
import { BunShell } from '../src/adapters/system/shell';
import { ConsoleIo } from '../src/adapters/terminal/console-io';
import { CliProgressBar } from '../src/adapters/terminal/progress';
import { InquirerPrompt } from '../src/adapters/terminal/prompt';
import { OraSpinner } from '../src/adapters/terminal/spinner';
import { cliConfig } from '../src/config/cli-config';
import { DoctorService } from '../src/lib/kv/doctor-service';
import { KvService } from '../src/lib/kv/service';

/** REDIS_HOST/REDIS_PORT env overrides (needed under docker, where 127.0.0.1 is the container). */
function resolveConnection(): RedisConnection {
  const parsedPort = Number(process.env.REDIS_PORT);
  return {
    host: process.env.REDIS_HOST || cliConfig.redis.host,
    port: Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : cliConfig.redis.port,
  };
}

/** Composition root: the whole world is constructed here, once; commands only invoke it. */
async function main(): Promise<void> {
  // Adapters
  const store = new RedisKeyValueStore(resolveConnection());
  const io = new ConsoleIo();
  const spinner = new OraSpinner();
  const progress = new CliProgressBar();
  const prompt = new InquirerPrompt();
  const shell = new BunShell();
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  // Domain services
  const kv = new KvService(store);
  const doctor = new DoctorService(store, shell);

  // API layer: commander routes → controllers
  const program = new Command()
    .name(cliConfig.binaryName)
    .description(cliConfig.description)
    .version(cliConfig.version, '-v, --version', 'print the CLI version')
    .showHelpAfterError();
  new SetController(kv, io).register(program);
  new GetController(kv, io, prompt, interactive).register(program);
  new SeedController(kv, io, progress).register(program);
  new DoctorController(doctor, io, spinner).register(program);

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    io.error((error as Error).message);
    process.exitCode = 1;
  } finally {
    // A close() failure must not mask the command's own error + exit code.
    try {
      await store.close();
    } catch (closeError) {
      io.error(`failed to close key-value backend cleanly: ${(closeError as Error).message}`);
    }
  }
}

await main();
