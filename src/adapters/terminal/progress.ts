import cliProgress from 'cli-progress';
import type { IProgressReporter } from '../../lib/kv/interfaces';

export class CliProgressBar implements IProgressReporter {
  // noTTYOutput keeps CI logs sane.
  private readonly bar = new cliProgress.SingleBar({ noTTYOutput: true }, cliProgress.Presets.shades_classic);

  start(total: number): void {
    this.bar.start(total, 0);
  }

  tick(): void {
    this.bar.increment();
  }

  stop(): void {
    this.bar.stop();
  }
}
