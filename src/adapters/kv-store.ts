export interface IKeyValueStore {
  /**
   * Persist `value` under `key`. When `ttlSeconds` is supplied the entry expires after that
   * many seconds; the parameter is optional so existing callers stay source-compatible.
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  close(): Promise<void>;
}

export interface RedisConnection {
  readonly host: string;
  readonly port: number;
}
