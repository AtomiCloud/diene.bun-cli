import chalk from 'chalk';

/** Presentation port for the CLI controllers — success/warn to stdout, error to stderr. */
export interface ICliIo {
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export class ConsoleIo implements ICliIo {
  success(message: string): void {
    console.log(chalk.green(message));
  }

  warn(message: string): void {
    console.log(chalk.yellow(message));
  }

  error(message: string): void {
    console.error(chalk.red(message));
  }
}
