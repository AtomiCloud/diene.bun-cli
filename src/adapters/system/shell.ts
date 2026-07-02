import { $ } from 'bun';
import type { IShell } from '../../lib/kv/interfaces';

/** Bun Shell ($) — zero-dependency, safely escaped shell calls. */
export class BunShell implements IShell {
  async platform(): Promise<string> {
    return (await $`uname -srm`.text()).trim();
  }
}
