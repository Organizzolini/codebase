# 🔌 Embedding

Nothing depends on `@conformetry/cli`. Embedding conformetry means depending on
the runtime packages directly — the command line is one host among others, and
holds no logic of its own. This example proves it: a single script that
generates and validates with no CLI anywhere in the process.

## Run it

```bash
pnpm exec nx run conformetry-examples:embedding
```

```text
Generated 1 file(s) into /var/folders/…/conformetry-embedding-a1b2c3
All checked files conform.
```

The script is [`embed.ts`](embed.ts), and it is about a hundred lines.

## What it wires

Both runtimes are NestJS providers, so a host wires them the way it wires
anything else:

```ts
@Module({
  imports: [
    ConfigurationModule,
    GenerationModule,
    TemplateDiscoveryModule,
    ValidationModule,
  ],
})
class EmbeddedConformetryModule {}

const context = await NestFactory.createApplicationContext(
  EmbeddedConformetryModule,
  { abortOnError: false, logger: false },
);
```

`ValidationModule` re-exports the discovery, reporting, and scoring modules it
already depends on, so a host that validates gets instance matching and report
rendering without naming them.

Six services do the work:

| Service | Package | What it is asked for |
| ------- | ------- | -------------------- |
| `ConfigurationService` | `@conformetry/configuration` | `loadConformetryConfiguration(path)` |
| `GenerationService` | `@conformetry/generation` | `runGenerator({ definition, inputs, instancePath })` |
| `InstanceDiscoveryService` | `@conformetry/configuration` | `findInstances({ patterns, workingDirectory })` |
| `TemplateDiscoveryService` | `@conformetry/configuration` | `collectTemplates({ configuration, workingDirectory })` |
| `ValidationService` | `@conformetry/validation` | `validate({ instances, templates })` |
| `ReportingService` | `@conformetry/core` | `formatReport({ fileResults, scores, workingDirectory })` |

Note what the host itself is responsible for: **expanding globs into
instances**. `ValidationService.validate` takes instances, not patterns, because
an Nx plugin filters by project tags and a command-line host reads a config —
so the validation package never needs to know what a workspace is.

## Where the seams are

Filesystem and formatter access go through **adapters** —
`FileSystemAdapter` and `FormatterAdapter`, both exported from
`@conformetry/generation` — which is how `@conformetry/nx` reuses this runtime
unchanged against a virtual `Tree`. This script supplies neither, so generation
falls back to the real filesystem and no formatter, which is what the
command-line host does too.

Rendering deliberately is **not** an adapter. Validation has to substitute
exactly as generation does, or validation would flag the files the generator
itself produced.

## Decorator metadata is not optional

The script needs `reflect-metadata` imported first, and it needs to be compiled
by something that preserves decorator metadata:

```json
{ "compilerOptions": { "emitDecoratorMetadata": true, "experimentalDecorators": true } }
```

The target that runs it uses `@swc-node/register` for that reason. A loader that
merely strips types — `tsx`, plain esbuild, Node's own type stripping — erases
the metadata NestJS constructor injection reads, and the failure is quiet: the
services construct with `undefined` dependencies rather than erroring at import.

## The package graph

Conformetry is split so that embedding it does not mean depending on a CLI.
`@conformetry/core` is the leaf — it depends on nothing else in the graph — and
every other package declares exactly which siblings it may import. This example
imports five of them, and this repository's own Nx boundary rules forbid it from
importing `@conformetry/cli` at all, which is the same claim enforced rather
than asserted.

## Next

[failure-modes](../failure-modes/README.md), for what the whole toolchain lets
through.
