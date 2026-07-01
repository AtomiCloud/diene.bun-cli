import { describe, it } from 'bun:test';
import should from 'should';
import { cliConfig } from '../../../src/config/cli-config';

describe('cliConfig (CLI runtime surface)', () => {
  it('should expose the CLI identity', () => {
    should(cliConfig.binaryName).equal('bun-cli');
    should(cliConfig.description).be.a.String();
  });

  it('should source the version from package.json', () => {
    should(cliConfig.version).be.a.String();
    should(cliConfig.version).match(/^\d+\.\d+\.\d+/);
  });

  it('should expose Redis defaults', () => {
    should(cliConfig.redis.host).be.a.String();
    should(cliConfig.redis.port).be.a.Number();
  });
});
