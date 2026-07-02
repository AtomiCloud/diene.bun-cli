import { describe, it } from 'bun:test';
import should from 'should';
import { runSet } from '../../../src/cli/commands/set';
import { captureIo, FakeKeyValueStore } from './fakes';

describe('runSet', () => {
  it('should write the namespacedKey-composed key through the store and return exit 0', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    const code = await runSet({ store, io }, 'Bun Base', 'Sample Key', 'hello');

    // Assert
    should(code).equal(0);
    should(store.setCalls).have.length(1);
    should(store.setCalls[0]).deepEqual({ key: 'bun-base:sample-key', value: 'hello', ttlSeconds: undefined });
    should(io.successes).have.length(1);
    should(io.errors).be.empty();
  });

  it('should pass the parsed ttl through to the store when --ttl is given', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    const code = await runSet({ store, io }, 'ns', 'key', 'v', { ttl: '60' });

    // Assert
    should(code).equal(0);
    should(store.setCalls[0]?.ttlSeconds).equal(60);
    should(io.successes[0]).match(/expires in 60s/);
  });

  it('should reject a non-positive ttl with exit 1 and not touch the store', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    const code = await runSet({ store, io }, 'ns', 'key', 'v', { ttl: '0' });

    // Assert
    should(code).equal(1);
    should(store.setCalls).be.empty();
    should(io.errors[0]).match(/--ttl/);
  });

  it('should reject an out-of-range ttl with exit 1 rather than mislabel it a backend error', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    // One year + 1 second — beyond MAX_TTL_SECONDS; also exercises the isSafeInteger path.
    const code = await runSet({ store, io }, 'ns', 'key', 'v', { ttl: String(365 * 24 * 60 * 60 + 1) });

    // Assert
    should(code).equal(1);
    should(store.setCalls).be.empty();
    should(io.errors[0]).match(/--ttl/);
    should(io.errors[0]).not.match(/backend/);
  });

  it('should reject hex/exponential ttl notation that Number() would silently coerce', async () => {
    for (const ttl of ['0x10', '1e2', ' 60', '6.0']) {
      // Arrange
      const store = new FakeKeyValueStore();
      const io = captureIo();

      // Act
      const code = await runSet({ store, io }, 'ns', 'key', 'v', { ttl });

      // Assert
      should(code).equal(1);
      should(store.setCalls).be.empty();
      should(io.errors[0]).match(/--ttl must be a positive integer/);
    }
  });

  it('should map a namespace validation error to a clear message and exit 1', async () => {
    // Arrange
    const store = new FakeKeyValueStore();
    const io = captureIo();

    // Act
    const code = await runSet({ store, io }, '!!!', 'key', 'v');

    // Assert
    should(code).equal(1);
    should(store.setCalls).be.empty();
    should(io.errors[0]).match(/namespace must not be empty/);
  });

  it('should report an unreachable backend with exit 1', async () => {
    // Arrange
    const store = new FakeKeyValueStore({}, new Error('connect ECONNREFUSED 127.0.0.1:6379'));
    const io = captureIo();

    // Act
    const code = await runSet({ store, io }, 'ns', 'key', 'v');

    // Assert
    should(code).equal(1);
    should(io.errors[0]).match(/failed to reach key-value backend/);
  });
});
