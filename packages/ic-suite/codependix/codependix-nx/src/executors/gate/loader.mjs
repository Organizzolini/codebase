// Registers the `@swc-node/register` hooks the codependix command line runs
// under, resolved from this plugin's own dependencies. The gate hands
// `node --import` this module's file URL.

// The hook's own `@swc-node/register/esm-register` cannot stand in for it:
// that registers `@swc-node/register/esm` relative to the working directory —
// the consumer's workspace root, which need not have the hook installed, and
// under pnpm cannot see this plugin's copy of it. Resolving from this module's
// URL reaches the copy this plugin depends on wherever it is installed. The
// hooks still read `tsconfig.json` from the working directory.

// `module.register` is deprecated (DEP0205) in favor of `module.registerHooks`,
// which runs synchronous hooks in-thread and so cannot run swc's asynchronous
// ones: there is no replacement to move to. This file is JavaScript, shipped
// as written, so the type-aware `no-deprecated` lint never reads the call. If
// a Node release removes `register`, every gate fails loudly rather than
// passing. Node 26 prints DEP0205 on each gate's child process.
import { register } from "node:module";

register("@swc-node/register/esm", import.meta.url);
