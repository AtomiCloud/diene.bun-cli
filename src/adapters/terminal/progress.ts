import cliProgress from 'cli-progress';

/** Scaffold-owned progress port — structurally matches any domain progress reporter the glue bridges. */
export interface IProgressBar {
  start(total: number): void;
  tick(): void;
  stop(): void;
}

export class CliProgressBar implements IProgressBar {
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
