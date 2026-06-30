#!/usr/bin/env bun
import { consoleIo } from '../src/cli/output';
import { buildProgram } from '../src/cli/program';

/**
 * Executable entry point and the single file `bun build --compile` targets.
 *
 * Thin by design: it builds the commander program from the CLI tier and parses argv. Domain
 * and validation errors are handled inside the command handlers (mapped to coloured messages
 * + a non-zero exit code); anything that escapes is surfaced here as a final guardrail.
 */
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
