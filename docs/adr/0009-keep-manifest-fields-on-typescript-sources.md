# Keep manifest fields on TypeScript sources

A package's `main`, `types`, and `exports` point at TypeScript sources, and
`publishConfig` carries the emitted `dist/` paths beside them. pnpm applies
those overrides at publish time, so one manifest serves both readers: the
workspace and the Nx plugins load source, while a published consumer gets
`./dist/src/index.js` with declarations beside it.

This is not stylistic. `@conformetry/nx` and `@callidescope/nx` are registered
in `nx.json`, and Nx loads them while it builds the project graph — before any
target can run. Between them they pull in 18 workspace packages,
`@codebase/logging` included. Point any of those at built output and the graph
cannot load until they are built, and they cannot be built without the graph.
Only `publishConfig` escapes that circularity.

## Considered options

- **Point `main`/`types`/`exports` at `dist/`, the conventional arrangement.**
  Rejected: it deadlocks the plugin graph load described above. Two further
  obstacles were verified behind it, so breaking the circularity alone would not
  be enough. ESLint's `jsonc/sort-keys` sorts object keys and `exports` conditions
  are order-sensitive, so a `{ "types": …, "default": … }` map would be sorted
  with `default` first and `types` would become unreachable. And
  `fallow-dead-code` and `vitest` both resolve through the manifest and honor no
  `source` condition, so fallow reports live code as unused and vitest cannot
  resolve the package until it is built.
- **Trim the plugin entries' re-exports to shrink the closure.** Rejected, and
  worth recording because it reads like the obvious fix. Both entries re-export
  their package's modules, services, and types, which looks like the reason Nx
  pulls in so much. But every one of those names is already reachable through
  the static `plugin-context.utilities` import, which imports `MainModule`,
  which imports every feature module. Measured on the import graph, moving the
  re-exports to a second entry point removes two local files and **zero**
  workspace packages from `@conformetry/nx`, and nothing at all from
  `@callidescope/nx`.
- **Source fields with `publishConfig` overrides.** Chosen.

## Consequences

- **Verify a change here by packing, not by reading.** Run `pnpm pack` in the
  package and inspect the tarball's `package.json`.
- **pnpm applies only a known set of `publishConfig` fields** — `main`, `types`,
  `exports`, and `bin` among them. `executors`, `generators`, and `nx` are not,
  so the two Nx plugins keep those at the top level and list the JSON files they
  name in `files`.
- **`files` must name `dist`.** With no explicit `files`, packing falls back to
  the ignore files, and `dist` is gitignored — the tarball would ship no build
  output at all.
- **A plugin entry's `resolvePluginService` must stay a static import.** A
  dynamic `import()` escapes the `@swc-node/register` require hook into Node's
  own ESM resolver, which cannot load this workspace's extensionless TypeScript
  sources, and `nx g` then fails with
  `Cannot find module './modules/plugin/plugin-context.utilities'`.
- **Every build writes into its own project's `dist/`**, never a top-level one.
  That is what lets one path be correct in both places a manifest is read: the
  workspace resolves a package through its own directory, and a published
  tarball is that same directory.
