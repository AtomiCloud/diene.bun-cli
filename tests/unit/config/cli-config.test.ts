import { describe, it } from 'bun:test';
import should from 'should';
import { cliConfig } from '../../../src/config/cli-config';

describe('cliConfig (single config surface)', () => {
  it('should expose the real per-instance identity and channel values', () => {
    should(cliConfig.binaryName).equal('bun-cli');
    should(cliConfig.gemfuryAccount).equal('atomicloud');
    should(cliConfig.pushEndpoint).equal('push.fury.io/atomicloud');
    should(cliConfig.homebrewTap).equal('AtomiCloud/homebrew-tap');
    should(cliConfig.dockerRegistry).equal('ghcr.io');
    should(cliConfig.imageName).equal('diene-bun-cli');
    should(cliConfig.nixPackageName).equal('bun-cli');
  });

  it('should source the version from package.json', () => {
    should(cliConfig.version).be.a.String();
    should(cliConfig.version).match(/^\d+\.\d+\.\d+/);
  });

  it('should list the five supported compile targets', () => {
    const bunTargets = cliConfig.compileTargets.map(t => t.bunTarget);
    should(bunTargets).deepEqual([
      'bun-linux-x64-baseline',
      'bun-linux-arm64',
      'bun-darwin-arm64',
      'bun-linux-x64-musl-baseline',
      'bun-linux-arm64-musl',
    ]);
  });

  it('should compile both x64 variants as -baseline for CPU + emulation compatibility', () => {
    const x64 = cliConfig.compileTargets.filter(t => t.arch === 'x64');
    should(x64).have.length(2);
    for (const target of x64) {
      should(target.bunTarget).match(/-baseline$/);
    }
  });

  it('should split targets into three glibc and two musl variants', () => {
    const glibc = cliConfig.compileTargets.filter(t => t.libc === 'glibc');
    const musl = cliConfig.compileTargets.filter(t => t.libc === 'musl');
    should(glibc).have.length(3);
    should(musl).have.length(2);
  });

  it('should give every target a unique artifact name', () => {
    const artifacts = cliConfig.compileTargets.map(t => t.artifact);
    should(new Set(artifacts).size).equal(artifacts.length);
  });
});
