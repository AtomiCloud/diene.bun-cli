#!/usr/bin/env bun
import { consoleIo } from '../src/cli/output';
import { buildProgram } from '../src/cli/program';

/** Executable entry — the file `bun build --compile` targets; escaped errors surface here. */
async function main(): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    consoleIo.error((error as Error).message);
    process.exitCode = 1;
  }
}

await main();
