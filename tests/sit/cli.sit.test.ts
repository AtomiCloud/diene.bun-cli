import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

// SIT (see docs/developer/standard/testing): black-box journeys through the COMPILED binary
// against a real Redis — every command is an invariant here. No coverage (separate process).
const os = process.platform === 'darwin' ? 'darwin' : 'linux';
const arch = process.arch === 'arm64' ? 'arm64' : 'x64-baseline';
const bin = process.env.CLI_BIN ?? `dist/bin/bun-cli-${os}-${arch}`;

interface CliResult {
  readonly code: number;
  readonly out: string;
  readonly err: string;
}

let container: StartedTestContainer | undefined;
let redisEnv: Record<string, string> = {};

async function cli(args: string[], env: Record<string, string> = redisEnv): Promise<CliResult> {
  const proc = Bun.spawn([bin, ...args], {
    env: { ...process.env, NO_COLOR: '1', ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out, err };
}

beforeAll(async () => {
  container = await new GenericContainer('redis:7.4.5-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .start();
  redisEnv = { REDIS_HOST: container.getHost(), REDIS_PORT: String(container.getMappedPort(6379)) };
}, 120_000);

afterAll(async () => {
  await container?.stop();
}, 120_000);

describe('bun-cli (SIT, compiled binary)', () => {
  it('prints a semver with --version', async () => {
    const actual = await cli(['--version']);
    expect(actual.code).toBe(0);
    expect(actual.out.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('lists every command in --help', async () => {
    const actual = await cli(['--help']);
    expect(actual.code).toBe(0);
    for (const command of ['set', 'get', 'seed', 'doctor']) expect(actual.out).toContain(command);
  });

  it('round-trips set then get', async () => {
    const set = await cli(['set', 'sit', 'greeting', 'hello']);
    expect(set.code).toBe(0);

    const get = await cli(['get', 'sit', 'greeting']);
    expect(get.code).toBe(0);
    expect(get.out).toContain('hello');
  });

  it('accepts set --ttl and the value is readable', async () => {
    const set = await cli(['set', 'sit', 'ephemeral', 'soon-gone', '--ttl', '60']);
    expect(set.code).toBe(0);

    const get = await cli(['get', 'sit', 'ephemeral']);
    expect(get.out).toContain('soon-gone');
  });

  it('reports not-found with a non-zero exit', async () => {
    const actual = await cli(['get', 'sit', 'missing-key']);
    expect(actual.code).not.toBe(0);
    expect(actual.out).toContain('not found');
  });

  it('rejects an invalid --ttl with a non-zero exit', async () => {
    const actual = await cli(['set', 'sit', 'k', 'v', '--ttl', 'abc']);
    expect(actual.code).not.toBe(0);
    expect(actual.err).toContain('invalid input');
  });

  it('seeds N entries readable afterwards', async () => {
    const seed = await cli(['seed', 'sit-seed', '5']);
    expect(seed.code).toBe(0);
    expect(seed.out).toContain('seeded 5 entries');

    const get = await cli(['get', 'sit-seed', 'sample-3']);
    expect(get.out).toContain('value-3');
  });

  it('rejects a non-numeric seed count', async () => {
    const actual = await cli(['seed', 'sit-seed', 'abc']);
    expect(actual.code).not.toBe(0);
    expect(actual.err).toContain('invalid input');
  });

  it('doctor reports platform and a reachable backend', async () => {
    const actual = await cli(['doctor']);
    expect(actual.code).toBe(0);
    expect(actual.out).toContain('platform:');
    expect(actual.out + actual.err).toContain('reachable');
  });

  it('doctor exits non-zero when the backend is unreachable', async () => {
    const actual = await cli(['doctor'], { REDIS_HOST: '127.0.0.1', REDIS_PORT: '1' });
    expect(actual.code).not.toBe(0);
  });

  it('fails an unknown command with help output', async () => {
    const actual = await cli(['bogus']);
    expect(actual.code).not.toBe(0);
    expect(actual.err.toLowerCase()).toContain('unknown command');
  });
});
