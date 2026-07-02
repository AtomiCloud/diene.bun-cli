import { describe, expect, it } from 'bun:test';
import { runSeed } from '../../../src/cli/commands/seed';
import { EXIT_ERROR, EXIT_OK } from '../../../src/cli/exit-codes';
import { FakeKeyValueStore, captureIo, captureProgress } from './fakes';

describe('runSeed', () => {
  it('writes N namespaced entries and drives the progress bar', async () => {
    const store = new FakeKeyValueStore();
    const io = captureIo();
    const progress = captureProgress();

    const exit = await runSeed({ store, io, progress }, 'ns', '3');

    expect(exit).toBe(EXIT_OK);
    expect(store.setCalls.map(c => c.key)).toEqual(['ns:sample-1', 'ns:sample-2', 'ns:sample-3']);
    expect(progress.totals).toEqual([3]);
    expect(progress.ticks).toBe(3);
    expect(progress.stopped).toBe(true);
    expect(io.successes[0]).toContain('seeded 3 entries');
  });

  it('rejects a non-integer or out-of-range count', async () => {
    const store = new FakeKeyValueStore();
    const io = captureIo();

    for (const count of ['abc', '0', '-1', '1.5', '10001']) {
      const exit = await runSeed({ store, io, progress: captureProgress() }, 'ns', count);
      expect(exit).toBe(EXIT_ERROR);
    }
    expect(store.setCalls).toHaveLength(0);
  });

  it('stops the bar and reports when the backend is unreachable', async () => {
    const store = new FakeKeyValueStore({}, new Error('connection refused'));
    const io = captureIo();
    const progress = captureProgress();

    const exit = await runSeed({ store, io, progress }, 'ns', '2');

    expect(exit).toBe(EXIT_ERROR);
    expect(progress.stopped).toBe(true);
    expect(io.errors[0]).toContain('failed to reach the key-value backend');
  });
});
