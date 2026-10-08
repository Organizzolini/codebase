// Registers the `@swc-node/register` hooks the codependix command line runs
// under, resolved from this plugin's own dependencies. The gate hands
// `node --import` this module's file URL.

// The hook's own `@swc-node/register/esm-register` cannot stand in for it:
// that registers `@swc-node/register/esm` relative to the working directory —
// the consumer's workspace root, which need not have the hook installed, and
// under pnpm cannot see this plugin's copy of it. Resolving from this module's
// URL reaches the copy this plugin depends on wherever it is installed. The
// hooks still read `tsconfig.json` from the working directory.

// JavaScript rather than TypeScript, and shipped as written rather than built,
// for the reason `conformetry-nx`'s `src/main.mjs` is: `module.register` is
// the only API that runs these asynchronous hooks, and its synchronous
// successor, `module.registerHooks`, cannot.
import { register } from "node:module";

register("@swc-node/register/esm", import.meta.url);
