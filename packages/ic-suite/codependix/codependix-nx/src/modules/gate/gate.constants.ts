// ♟️ Constants

/**
 * The loader the codependix command line runs under.
 *
 * Booting a NestJS container imports the workspace's own TypeScript sources,
 * and constructor injection reads the decorator metadata only a compiler that
 * emits it provides. `@swc-node/register` does; `tsx` and esbuild silently do
 * not, and a container then boots with every injected dependency undefined.
 *
 * Passed to `--import` as the bare specifier, so Node resolves it from the
 * workspace root the command line runs in — the same loader, and the same
 * `tsconfig.json` beside it, that the workspace's own sources are built with.
 */
export const LOADER_SPECIFIER = "@swc-node/register/esm-register";

/**
 * The codependix command line's entry, as `@codependix/cli` exports it.
 *
 * Resolved through the package's exports rather than a path into this
 * repository, so the same specifier reaches `src/main.ts` in this workspace
 * and `dist/src/main.js` in an installed copy.
 */
export const CLI_ENTRY_SPECIFIER = "@codependix/cli/main";

/**
 * Filename this plugin's own registration is written in.
 *
 * Read for the `configurationPath` an executor was not given, because Nx hands
 * plugin options to `createNodes` and never to an executor.
 */
export const NX_CONFIGURATION_FILENAME = "nx.json";
