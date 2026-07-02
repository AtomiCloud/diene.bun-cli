export interface IKeyValueStore {
  /** Persist `value` under `key`, optionally expiring after `ttlSeconds`. */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  close(): Promise<void>;
}

export interface RedisConnection {
  readonly host: string;
  readonly port: number;
}
