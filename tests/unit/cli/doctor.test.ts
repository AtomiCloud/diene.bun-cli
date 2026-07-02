import { describe, expect, it } from 'bun:test';
import { runDoctor } from '../../../src/cli/commands/doctor';
import { EXIT_ERROR, EXIT_OK } from '../../../src/cli/exit-codes';
import { FakeKeyValueStore, captureIo, captureSpinner } from './fakes';

describe('runDoctor', () => {
  it('reports the platform and a reachable backend', async () => {
    const store = new FakeKeyValueStore();
    const io = captureIo();
    const spinner = captureSpinner();

    const exit = await runDoctor({ store, io, spinner, shell: async () => 'Darwin 25.0.0 arm64' });

    expect(exit).toBe(EXIT_OK);
    expect(io.successes[0]).toBe('platform: Darwin 25.0.0 arm64');
    expect(store.setCalls[0]?.key).toBe('doctor:probe');
    expect(spinner.events.at(-1)).toBe('succeed:key-value backend reachable');
  });

  it('fails the spinner when the backend is unreachable', async () => {
    const store = new FakeKeyValueStore({}, new Error('connection refused'));
    const io = captureIo();
    const spinner = captureSpinner();

    const exit = await runDoctor({ store, io, spinner, shell: async () => 'Linux' });

    expect(exit).toBe(EXIT_ERROR);
    expect(spinner.events.at(-1)).toContain('fail:key-value backend unreachable');
  });

  it('degrades to a warning when the shell call fails', async () => {
    const store = new FakeKeyValueStore();
    const io = captureIo();
    const spinner = captureSpinner();

    const exit = await runDoctor({
      store,
      io,
      spinner,
      shell: async () => {
        throw new Error('uname not found');
      },
    });

    expect(exit).toBe(EXIT_OK);
    expect(io.warnings[0]).toContain('could not detect platform');
  });
});
