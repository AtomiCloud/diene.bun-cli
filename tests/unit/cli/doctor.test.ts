import { describe, it } from 'bun:test';
import should from 'should';
import { runDoctor } from '../../../src/cli/commands/doctor';
import { EXIT_ERROR, EXIT_OK } from '../../../src/cli/exit-codes';
import { FakeKeyValueStore, captureIo, captureSpinner } from './fakes';

describe('runDoctor', () => {
  it('reports the platform and a reachable backend', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();
    const spinner = captureSpinner();

    // Act
    const exit = await runDoctor({ store, io, spinner, shell: async () => 'Darwin 25.0.0 arm64' });

    // Assert
    should(exit).equal(EXIT_OK);
    should(io.successes[0]).equal('platform: Darwin 25.0.0 arm64');
    should(store.setCalls[0]?.key).equal('doctor:probe');
    should(spinner.events.at(-1)).equal('succeed:key-value backend reachable');
  });

  it('fails the spinner when the backend is unreachable', async () => {
    // Arrange
    const store = new FakeKeyValueStore({}, new Error('connection refused'));
    const io = captureIo();
    const spinner = captureSpinner();

    // Act
    const exit = await runDoctor({ store, io, spinner, shell: async () => 'Linux' });

    // Assert
    should(exit).equal(EXIT_ERROR);
    should(spinner.events.at(-1)).containEql('fail:key-value backend unreachable');
  });

  it('degrades to a warning when the shell call fails', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();
    const spinner = captureSpinner();

    // Act
    const exit = await runDoctor({
      store,
      io,
      spinner,
      shell: async () => {
        throw new Error('uname not found');
      },
    });

    // Assert
    should(exit).equal(EXIT_OK);
    should(io.warnings[0]).containEql('could not detect platform');
  });
});
