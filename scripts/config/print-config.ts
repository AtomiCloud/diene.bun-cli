/**
 * Serialises the single config surface (`src/config/cli-config.ts`) to JSON on stdout so the
 * build/publish shell scripts read exactly the same per-instance values as the CLI (FR12).
 * There is no second copy of these values — this is the one bridge from TS into shell.
 */
import { cliConfig } from '../../src/config/cli-config';

process.stdout.write(`${JSON.stringify(cliConfig, null, 2)}\n`);
