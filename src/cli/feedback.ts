import cliProgress from 'cli-progress';
import ora from 'ora';

/** Live-feedback boundary (spinner + progress bar) — injected like CliIo so handlers stay testable. */
export interface Spinner {
  start(text: string): void;
  succeed(text: string): void;
  fail(text: string): void;
}

export interface ProgressBar {
  start(total: number): void;
  tick(): void;
  stop(): void;
}

export function oraSpinner(): Spinner {
  const spinner = ora();
  return {
    start: (text: string): void => {
      spinner.start(text);
    },
    succeed: (text: string): void => {
      spinner.succeed(text);
    },
    fail: (text: string): void => {
      spinner.fail(text);
    },
  };
}

export function cliProgressBar(): ProgressBar {
  const bar = new cliProgress.SingleBar({ noTTYOutput: true }, cliProgress.Presets.shades_classic);
  return {
    start: (total: number): void => {
      bar.start(total, 0);
    },
    tick: (): void => {
      bar.increment();
    },
    stop: (): void => {
      bar.stop();
    },
  };
}
