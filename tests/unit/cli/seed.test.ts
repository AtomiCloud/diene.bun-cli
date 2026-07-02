import { describe, it } from 'bun:test';
import should from 'should';
import { runSeed } from '../../../src/cli/commands/seed';
import { EXIT_ERROR, EXIT_OK } from '../../../src/cli/exit-codes';
import { FakeKeyValueStore, captureIo, captureProgress } from './fakes';

describe('runSeed', () => {
  it('writes N namespaced entries and drives the progress bar', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();
    const progress = captureProgress();

    // Act
    const exit = await runSeed({ store, io, progress }, 'ns', '3');

    // Assert
    should(exit).equal(EXIT_OK);
    should(store.setCalls.map(c => c.key)).deepEqual(['ns:sample-1', 'ns:sample-2', 'ns:sample-3']);
    should(progress.totals).deepEqual([3]);
    should(progress.ticks).equal(3);
    should(progress.stopped).be.true();
    should(io.successes[0]).containEql('seeded 3 entries');
  });

  it('rejects a non-integer or out-of-range count', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    for (const count of ['abc', '0', '-1', '1.5', '10001']) {
      // Act
      const exit = await runSeed({ store, io, progress: captureProgress() }, 'ns', count);

      // Assert
      should(exit).equal(EXIT_ERROR);
    }

    // Assert
    should(store.setCalls).have.length(0);
  });

  it('stops the bar and reports when the backend is unreachable', async () => {
    // Arrange
    const store = new FakeKeyValueStore({}, new Error('connection refused'));
    const io = captureIo();
    const progress = captureProgress();

    // Act
    const exit = await runSeed({ store, io, progress }, 'ns', '2');

    // Assert
    should(exit).equal(EXIT_ERROR);
    should(progress.stopped).be.true();
    should(io.errors[0]).containEql('failed to reach the key-value backend');
  });
});
