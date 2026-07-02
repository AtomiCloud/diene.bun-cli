import { describe, it } from 'bun:test';
import should from 'should';
import { runGet } from '../../../src/cli/commands/get';
import { captureIo, FakeKeyValueStore } from './fakes';

const neverPrompt = async (): Promise<string> => {
  throw new Error('prompt should not be called');
};

describe('runGet', () => {
  it('should read the namespacedKey-composed key and print the value with exit 0', async () => {
    // Arrange
    const store = new FakeKeyValueStore({ 'bun-base:sample-key': 'hello' });
    const io = captureIo();

    // Act
    const code = await runGet({ store, io, prompt: neverPrompt, interactive: false }, 'Bun Base', 'Sample Key');

    // Assert
    should(code).equal(0);
    should(store.getCalls).deepEqual(['bun-base:sample-key']);
    should(io.successes).deepEqual(['hello']);
  });

  it('should warn and exit 1 when the key is absent', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    const code = await runGet({ store, io, prompt: neverPrompt, interactive: false }, 'ns', 'missing');

    // Assert
    should(code).equal(1);
    should(io.warnings[0]).match(/not found/);
  });

  it('should fail fast with a clear message when key is omitted in a non-interactive context', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    const code = await runGet({ store, io, prompt: neverPrompt, interactive: false }, 'ns');

    // Assert
    should(code).equal(1);
    should(io.errors[0]).match(/missing argument: key/);
    should(store.getCalls).be.empty();
  });

  it('should prompt for the key via inquirer when omitted in an interactive terminal', async () => {
    // Arrange
    const store = new FakeKeyValueStore({ 'ns:prompted': 'value' });
    const io = captureIo();
    let prompted = false;
    const prompt = async (): Promise<string> => {
      prompted = true;
      return 'prompted';
    };

    // Act
    const code = await runGet({ store, io, prompt, interactive: true }, 'ns');

    // Assert
    should(prompted).be.true();
    should(code).equal(0);
    should(store.getCalls).deepEqual(['ns:prompted']);
    should(io.successes).deepEqual(['value']);
  });

  it('should report an unreachable backend with exit 1', async () => {
    // Arrange
    const store = new FakeKeyValueStore({}, new Error('connect ECONNREFUSED 127.0.0.1:6379'));
    const io = captureIo();

    // Act
    const code = await runGet({ store, io, prompt: neverPrompt, interactive: false }, 'ns', 'key');

    // Assert
    should(code).equal(1);
    should(io.errors[0]).match(/failed to reach key-value backend/);
  });

  it('should map a key validation error to a clear message and exit 1', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    const code = await runGet({ store, io, prompt: neverPrompt, interactive: false }, 'ns', '!!!');

    // Assert
    should(code).equal(1);
    should(io.errors[0]).match(/key must not be empty/);
  });
});
