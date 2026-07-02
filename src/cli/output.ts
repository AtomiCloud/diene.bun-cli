import chalk from 'chalk';

/** Presentation boundary — handlers depend on this, never on chalk/console, so they stay testable. */
export interface CliIo {
  success(message: string): void;
  warn(message: string): void;
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
