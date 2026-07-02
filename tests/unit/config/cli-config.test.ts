import { describe, it } from 'bun:test';
import should from 'should';
import { cliConfig } from '../../../src/config/cli-config';

describe('cliConfig (CLI runtime surface)', () => {
  it('should expose the CLI identity', () => {
    // Act
    const actual = cliConfig;

    // Assert
    should(actual.binaryName).equal('bun-cli');
    should(actual.description).be.a.String();
  });

  it('should source the version from package.json', () => {
    // Act
    const actual = cliConfig.version;

    // Assert
    should(actual).be.a.String();
    should(actual).match(/^\d+\.\d+\.\d+/);
  });

  it('should expose Redis defaults', () => {
    // Act
    const actual = cliConfig.redis;

    // Assert
    should(actual.host).be.a.String();
    should(actual.port).be.a.Number();
  });
});
