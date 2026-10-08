# CodependixNx: Nx Plugin

## Quick Start

**Type**: Nx plugin — one inferred target and its executor, built on a NestJS
application context

**Purpose**: Infers `codependix-gate` onto every `project.json` project but the
workspace root, so `nx affected -t codependix-gate` checks codependix
boundaries per project and fails the task named after the project whose
boundary broke.

The executor runs `codependix map --check boundaries --projects <project>`
**as a child process**, from the workspace root, under `node --import
<file URL of @codependix/nx/loader>`. A child process rather than an
in-process call, because the boundary check boots NestJS containers from
their TypeScript sources and constructor injection there needs the decorator
metadata only `@swc-node/register` emits — `tsx` and esbuild silently break
it. `src/executors/gate/loader.mjs` registers those hooks resolved from this
package's own dependencies, never the consumer's root. The command line's
entry is resolved through `@codependix/cli`'s `./main` package export, so an
installed copy runs `dist/src/main.js`.

The command line builds over the project's Nx dependency closure and fails
only on a finding charged to the project; this plugin adds selection and
caching, not judgment. It deliberately ships **no CLI of its own**, and it
depends on `@codependix/cli` alone — the `codependix-nx-layer` rule in
`configuration/codependix.config.ts` holds it to that.

## Architecture Overview

### Tech Stack

- **Framework**: NestJS application context (`NestFactory.createApplicationContext`),
  built once per process and cached on `globalThis`
- **Nx**: `@nx/devkit` — `createNodes`, an executor, a custom hasher, and
  Nx's `logger` for warnings
- **Loader**: `@swc-node/register`, registered by this package's own shim
- **Language**: Strict TypeScript

There is no environment schema, no `main.ts`, and no logger module: Nx calls
plugins from bare module-level functions, which bootstrap the context and
hand back a service.

### Execution Flow

```text
src/index.ts — createNodes
  ├─ resolveToolInputs (plugin-inputs.utilities.ts)   ← the command line's cache inputs
  └─ PluginService.inferTargets                       ← one gate per project.json

src/executors/gate/hasher.ts → GateService.hashTask   ← own-project runs hashed by Nx,
                                                        selection runs never replayed
src/executors/gate/executor.ts → GateService.run
  └─ node --import <loader URL> <@codependix/cli/main> map --check boundaries …
```

### Directory Layout

```text
src/
  index.ts                          # Plugin entry: createNodes, public exports
  main.module.ts                    # Root module: GateModule, PluginModule
  executors/gate/
    executor.ts                     # Nx executor → GateService.run
    hasher.ts                       # Nx hasher → GateService.hashTask
    loader.mjs                      # Registers the swc hooks; passed to --import
    schema.json                     # Executor options; shipped as-is in the tarball
  modules/
    gate/                           # GateService: arguments, selection, spawn, hashing
    plugin/                         # PluginService: options and inference
      plugin-context.utilities.ts   # Builds and caches the NestJS context
      plugin-inputs.utilities.ts    # resolveToolInputs: the command line's inputs
testing/                            # Shared test setup
```

`executors.json` names the executor and hasher by package specifier
(`@codependix/nx/src/executors/gate/*`), which Nx resolves through this
package's exports — the TypeScript sources here, `dist/` in an installed copy.
The schema is named by path and listed in `files`, so the tarball ships it.

## Development

### Caching rules

- **Tool inputs** (`resolveToolInputs`): inside this workspace, a
  `package.json`, `tsconfig.json`, and `src/**/!(*.test.*|*.spec.*)` glob per
  package in `@codependix/cli`'s `workspace:` closure. Each package is located
  through its entry and the manifest that names it; one that cannot be
  located is named in an Nx `logger.warn` and skipped. An installed command
  line yields one `externalDependencies` input instead. Never throws.
- **Test exclusion lives inside the positive glob.** Nx's affected
  computation reads only positive `{workspaceRoot}` inputs and ignores a
  `!`-prefixed one, so a negated input would not stop a test-only edit from
  selecting every gate.
- **Selection runs are never cached.** A gate whose effective `projects` or
  `tags` (target options, then configuration, then command line) judge any
  project but its own gets a random hash from `GateService.hashTask`.

### Key Commands

Always prefer running tasks through Nx rather than calling the underlying tools directly.

```bash
nx run codependix-nx:typecheck-code,lint-code,format-code,deprecate-code,guard-code   # Every static check, in one graph
nx run codependix-nx:type-coverage   # Strict, at 100
nx run codependix-nx:build           # Compile for publication
nx run codependix-nx:pack            # Tarball in dist/tarballs — never publish to rehearse
```

### Testing

```bash
nx run codependix-nx:vitest:unit          # Services, the hasher, the loader, tool inputs
nx run codependix-nx:vitest:integration   # The real executor against a fixture workspace
```

Fixtures live under this package's gitignored `tmp/`, never `os.tmpdir()`:
the swc loader resolves its helpers from the importing file's directory, so a
fixture outside the workspace passes on macOS and fails on Linux. The tool
input tests write a fixture closure with real `node_modules` links rather than
reading this repository's, whose size changes with every new dependency.

A consumer rehearsal needs a directory **outside** this repository: Node
resolves bare specifiers by climbing parent directories, so a consumer under
`tmp/` silently borrows this workspace's `node_modules`.

See the [testing-strategy skill](../../../../.agents/skills/testing-strategy/SKILL.md) and [testing-mocks skill](../../../../.agents/skills/testing-mocks/SKILL.md) for patterns and mock conventions.

## Key Files

- [src/index.ts](src/index.ts): Plugin entry Nx loads
- [src/modules/gate/gate.service.ts](src/modules/gate/gate.service.ts): The gate run and its hashing
- [src/modules/plugin/plugin-inputs.utilities.ts](src/modules/plugin/plugin-inputs.utilities.ts): Tool inputs
- [src/executors/gate/loader.mjs](src/executors/gate/loader.mjs): The `--import` shim
- [executors.json](executors.json): Executor, hasher, and schema
- [project.json](project.json): Nx targets

See the [triage-integration skill](../../../../.agents/skills/triage-integration/SKILL.md) for lint and git hook failures.
