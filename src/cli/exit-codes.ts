/**
 * Process exit codes shared by the CLI command handlers.
 *
 * Kept in a neutral module so neither command depends on the other merely to share these
 * generic status constants (the read command must not import from the write command).
 */
export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
