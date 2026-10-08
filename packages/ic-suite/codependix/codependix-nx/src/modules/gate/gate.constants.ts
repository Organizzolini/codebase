// ♟️ Constants

/**
 * The module that registers the loader the codependix command line runs
 * under, as this package exports it.
 *
 * Booting a NestJS container imports the workspace's own TypeScript sources,
 * and constructor injection reads the decorator metadata only a compiler that
 * emits it provides. `@swc-node/register` does; `tsx` and esbuild silently do
 * not, and a container then boots with every injected dependency undefined.
 *
 * Resolved through this package's own exports, so the hook comes from this
 * plugin's dependencies wherever it is installed. The module is
 * `src/executors/gate/loader.mjs`, shipped as written in either place.
 */
export const LOADER_SPECIFIER = "@codependix/nx/loader";

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
