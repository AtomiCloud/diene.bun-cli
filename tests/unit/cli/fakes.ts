import type { IKeyValueStore } from '../../../src/adapters/kv-store';
import type { CliIo } from '../../../src/cli/output';

/** Records a single `set` call so tests can assert the composed key, value, and ttl. */
export interface SetCall {
  readonly key: string;
  readonly value: string;
  readonly ttlSeconds: number | undefined;
}

/**
 * In-memory `IKeyValueStore` for unit tests — no real Redis. Optionally configured to throw
 * on `set`/`get` to exercise the unreachable-backend path.
 */
export class FakeKeyValueStore implements IKeyValueStore {
  readonly setCalls: SetCall[] = [];
  readonly getCalls: string[] = [];
  closed = false;

  constructor(
    private readonly initial: Record<string, string> = {},
    private readonly failure?: Error,
  ) {}

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.failure) throw this.failure;
    this.setCalls.push({ key, value, ttlSeconds });
    this.initial[key] = value;
  }

  async get(key: string): Promise<string | null> {
    this.getCalls.push(key);
    if (this.failure) throw this.failure;
    const value = this.initial[key];
    return value === undefined ? null : value;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

/** Captures everything written to the CLI IO so tests can assert on rendered output. */
export interface CapturedIo extends CliIo {
  readonly successes: string[];
  readonly warnings: string[];
  readonly errors: string[];
}

export function captureIo(): CapturedIo {
  const successes: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  return {
    successes,
    warnings,
    errors,
    success: (message: string): void => {
      successes.push(message);
    },
    warn: (message: string): void => {
      warnings.push(message);
    },
    error: (message: string): void => {
      errors.push(message);
    },
  };
}
