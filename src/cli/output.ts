import chalk from 'chalk';

/**
 * Presentation boundary for the CLI (FR1).
 *
 * Command handlers depend on this `CliIo` interface, never on `chalk`/`console` directly,
 * so colour formatting lives in one place and handlers stay unit-testable with a captured
 * fake (see `tests/unit/cli/`).
 */
export interface CliIo {
  /** A successful outcome — rendered green to stdout. */
  success(message: string): void;
  /** A non-fatal advisory (e.g. key not found) — rendered yellow to stdout. */
  warn(message: string): void;
  /** A failure — rendered red to stderr. */
  error(message: string): void;
}

/** Default IO that writes coloured output to the real console. */
export const consoleIo: CliIo = {
  success: (message: string): void => {
    console.log(chalk.green(message));
  },
  warn: (message: string): void => {
    console.log(chalk.yellow(message));
  },
  error: (message: string): void => {
    console.error(chalk.red(message));
  },
};
