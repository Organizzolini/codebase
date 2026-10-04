# Meanderaw: NestJS Command-Line Application

## Quick Start

**Type**: Node.js CLI application (NestJS + `nest-commander`)

**Purpose**: <!-- Briefly describe the specific purpose of this CLI application -->

### Run Locally

```bash
cp .env.default .env  # Fill in required environment variables
nx run meanderaw:start
```

## 🏛️ Before You Change a Meander

**A meander is a row in the Postgres database `MEANDERAW_POSTGRES_DB` names (`meanderaw_development`
by default), addressed by its lattice address — its Code, its rows, and its columns — and nothing else.** The formatted
Code spells out all three, so `code` alone is its identity; the row's `id` is a uuidv7
the database assigns, which changes on every sweep and must never reach committed output. There is no `output/<family>/*.svg`
tree, no per-family procedural motif service, and no `--type`/`--modifier` command line.
Generation is lattice-first for every family: a budgeted enumeration produces every
structurally distinct repeat within reach, one generic family-agnostic renderer draws each
one from its decoded Code, and a family is _read off_ the result rather than chosen before
it. See "One Command" and "Output Layout" in [README.md](./README.md).

**The corpus is two halves that partition it, and the partition is load-bearing.**
Rows with `isHardcoded` false hold the 30,279 meanders `MeanderEnumerationService`
walks — the fourteen shapes the edge budget admits. Rows with it true hold the 965 meanders of the historical corpus
that lie beyond that budget, extracted once as Codes from the retired file tree.
`HARDCODED_MEANDERS_BY_FAMILY` carries the filter and why it is by shape rather than by
Code: the enumeration applies no degree ceiling and no family filter, so at an admitted
shape _every_ structurally distinct meander is already a row before ingestion begins.
**Raising `MOSAIC_TILE_EDGE_BUDGET` without re-filtering that corpus is how the two halves
collide** — `draw-sweep.command.integration.test.ts` is what catches it.

**What bounds the enumeration is one edge budget, not a column cap.** A repeat is a
`columns` by `rows - 1` grid of lattice points, each carrying four direction bits, and its
edges are its only degrees of freedom — so a shape holds `2 ** (columns * (2 * rows - 3))`
repeats and rows and columns are not independent knobs.
`MOSAIC_TILE_EDGE_BUDGET` caps that edge count at 16, and
`MEANDER_ENUMERATION_MINIMUM_ROWS` sets the floor at 3, which between them admit fourteen
shapes: 3×1 through 3×5, 4×1 through 4×3, 5×1, 5×2, and 6×1 through 9×1. A shape past the
budget is refused rather than enumerated slowly. Raising it is a one-line change with a
visible effect on counts `mosaic-tiles.service.unit.test.ts` asserts — which is the point
of it being one number.

**A family is a combination of Characteristics, not a label a generator attached.**
`MeanderClassificationService` holds one predicate per family, read off a decoded grid's
measured Characteristics and its shape; a meander matching none is recorded with a null
`family`, which is most of the enumerated space and is the design rather than a gap.
Adding a family means adding a rule there, never a motif service. The same is true one
level down: `mosaic-naming` holds one predicate per sub-family, and **unbroken or broken
is a question about edges, not points** — `lines` and `dashes` differ on it, and so do
`bars` and `diamond`.

**A hardcoded row's `family` and `subFamily` are trusted, not classified.** Spec #813 puts
reclassifying the historical corpus through the new predicates explicitly out of scope, so
`HardcodedMeandersService` carries that metadata over rather than re-deriving it. Do not
"fix" a hardcoded row whose structure would classify differently.

**A duplicate lattice address is a build failure.** The unique index over `code` refuses
the second insert, and the sweep runs the enumerated half
first so the refusal names the hardcoded entry that caused it. Do not soften that into an
upsert.

**No row stores its drawing.** The renderer draws each meander from its Code, rows, and
columns when the index pages are built, so a renderer change needs no database change at
all. Nothing currently checks the database against a fresh sweep, either; a
Code's uniqueness is the one property the schema enforces.

### The charter, and what became of its gate

Meander geometry is governed by a charter of seven invariants, five of which are fixed.
They were extracted by measuring the 9,877 SVG files this repository used to commit, so
they are facts about output rather than intentions in source. The full charter, with the
measurements behind it, is in [README.md](./README.md), under "Meander Charter".

**The property test that gated them is gone with the corpus it swept.** It measured every
drawing the per-family sweep produced, and that sweep no longer exists; the structural
facts it asserted are now computed per row by `CharacteristicsService` and stored in the
row's one sparse `characteristics` JSON map, so they are queryable rather than gated.
Rebuilding a gate over the database is open work, not something this project claims to
have.

**Every Characteristic lives in that one map, and a missing key means zero or `false`.**
No Characteristic has a column of its own, so adding one needs no schema change — see
[ADR 0018](../../docs/adr/0018-store-every-characteristic-in-one-sparse-json-map.md). Raw
SQL reads one as `COALESCE((characteristics ->> 'key')::numeric, 0)`; a bare `->>` is
NULL for a missing key and silently drops it from a zero filter.

The three invariants that most often catch a change:

- **Space-filling.** Every interior white channel is exactly one stroke width — which
  equals half a grid unit. `GridGeometryService` derives stroke width and offset from the
  grid unit for this reason; setting either independently breaks the invariant silently.
- **No branching and no crossing.** These are the charter's two negotiable invariants, and
  the lattice-first corpus relaxes both wholesale: the enumerated space is every subset of
  a repeat's edges, junctions and crossings included. `forkCount` and `crossCount`, and the
  four directional fork counts behind them (`northForkCount`/`southForkCount`/
  `eastForkCount`/`westForkCount`), are recorded in each row's `characteristics` map
  rather than forbidden.
- **Band, not field.** Canvas height is fixed and `rows` sets density, not size. These
  patterns are meant for borders.

Two things that look like defects and are not:

- **Gaps wider than one stroke where a band terminates** are expected, and owned by
  [#338](https://github.com/Organizzolini/codebase/issues/338). Do not chase them.
- **Most enumerated rows carrying no family at all** is the design. Enumeration produces
  every structurally distinct repeat within budget, and membership is decided afterwards.

## Architecture Overview

### Tech Stack

- **Framework**: NestJS (modules, dependency injection, providers)
- **CLI runner**: `nest-commander` (`CommandRunner` + `@Command()` decorator)
- **Env validation**: `@nestjs/config` + `zod` (`environmentSchema` in `.constants.ts`)
- **Logging**: `@codebase/logging` — a `pino`-backed `LoggerService` (`Scope.TRANSIENT`)
- **Language**: Strict TypeScript

### Execution Flow

```text
src/main.ts
  └─ CommandFactory.run(MainModule)
       └─ domain command modules            ← add under src/modules/
```

### Directory Layout

```text
src/
  main.ts                           # Bootstrap — do not modify
  main.module.ts                    # Root NestJS module (imports ConfigModule, LoggerModule)
  constants.ts                      # Zod environmentSchema for env validation
  modules/
    <domain>/                       # Add feature modules here
      <domain>.module.ts
      <domain>.command.ts
      <domain>.service.ts
      <domain>.types.ts
      <domain>.constants.ts
      <domain>.<tier>.test.ts
testing/                            # Shared test utilities
```

### Module Graph

The modules this project defines and the imports between them are exported by
[codependix](https://github.com/Organizzolini/codebase/tree/main/packages/ic-suite/codependix/codependix-cli)
into the `## 🕸️ Codependix` section of [README.md](README.md), alongside this
project's Nx neighborhood and its file-level import graph. Regenerate all three
with:

```bash
nx run codebase:codependix:write
```

## Development

### Adding Business Logic

1. **Add domain command modules** — create `src/modules/<domain>/` with a NestJS module, command, service, types, and constants.
2. **Register in root module** — import the new module in `main.module.ts`.
3. **Validate env vars** — extend `environmentSchema` in `constants.ts` with all required environment variables.

### Logging

`LoggerService` and `LoggerModule` come from `@codebase/logging` — this project does not define its own logger. Add `"@codebase/logging": "workspace:*"` to `dependencies`, then import `LoggerModule` once in the root module; it is `@Global()`, so feature modules inject `LoggerService` without importing it.

`LoggerService` is `Scope.TRANSIENT` — each injecting class gets its own instance. Always call `setContext` in the constructor:

```ts
constructor(private readonly logger: LoggerService) {
  super();
  this.logger.setContext(MyService.name);
}
```

Outputs structured JSON in production (`NODE_ENV=production`) and pretty-printed logs in development.

### Key Commands

Always prefer running tasks through Nx rather than calling the underlying tools directly.

```bash
nx run codebase:postgres-container:up     # The local Postgres the database lives in
nx run meanderaw:start                    # Clear the meander rows, then regenerate the sweep into them
nx run meanderaw:typecheck-code,lint-code,format-code,deprecate-code,guard-code   # Every static check, in one graph
nx run meanderaw:typecheck       # tsc --noEmit
nx run meanderaw:oxfmt           # Formatting
```

This application has **one command, `draw`**, and it is the default — so `start` runs it,
and it always writes the database `MEANDERAW_POSTGRES_DB` names. With no arguments it clears that
database's meander rows and sweeps every meander the application can draw back into it: the whole lattice's unit space, enumerated
and classified, then the historical corpus's hardcoded Codes beyond that budget. With
`--rows`, `--columns`, and `--code` it decodes, measures, and persists that one:

```bash
nx run meanderaw:start --args="--rows 3 --columns 2 --code 3c9a"
```

**Nothing but `start` runs the command**, so no aggregate target — `guard-code`, `lint-code`,
or any other — rewrites the database and the committed pages as a side effect. Keep it
that way: a `dependsOn` on `start` would rewrite them on every run.

**The database lives in Postgres, not in the repository.** The local Docker init creates
the `meanderaw_development` database and the schema of the same name, the defaults of
`MEANDERAW_POSTGRES_DB` and `MEANDERAW_POSTGRES_SCHEMA`. Every meanderaw variable carries the
`MEANDERAW_` prefix, so the unprefixed `MEANDERAW_POSTGRES_*` the root `.env` sets for lexico — which
Nx loads into every task — never reaches it. The committed
`output/*.html` pages are the only artifact a sweep commits — see
[ADR 0020](../../docs/adr/0020-store-meanders-in-postgres.md). Integration suites start
their own throwaway `postgres:18-alpine` container through `@testcontainers/postgresql`
and hand it to `testing/database.ts`, so Docker must be running to test them.

There is deliberately no second command, and no other flag — see "One Command" and
"Output Layout" in [README.md](./README.md).

### Testing

Follow the codebase's strict three-tier testing strategy. Co-locate test files with the source they test.

```bash
nx run meanderaw:vitest:unit          # Fast (<100ms) — pure logic, mocked DI
nx run meanderaw:vitest:integration   # Moderate (1-2s) — real database/API I/O
nx run meanderaw:vitest:end-to-end    # Slow (30-60s) — full CLI execution
```

| Tier | File pattern | What to test |
| ---- | ------------ | ------------ |
| Unit | `*.unit.test.ts` | Pure functions, service methods with mocked deps |
| Integration | `*.integration.test.ts` | Database queries, external API clients |
| End-to-end | `*.end-to-end.test.ts` | Full `CommandFactory.run()` execution |

See the [testing-strategy skill](../../.agents/skills/testing-strategy/SKILL.md) and [testing-mocks skill](../../.agents/skills/testing-mocks/SKILL.md) for patterns and mock conventions.

## Writing Modules

Use the generator to scaffold new domain modules, then implement the service:

```bash
nx g conformetry:nestjs-service-module --name=<domain>
```

This creates five files in `src/modules/<domain>/`:

| File | Purpose |
| ---- | ------- |
| `<domain>.module.ts` | Declares providers, imports, and exports |
| `<domain>.service.ts` | Business logic — the only place you write domain code |
| `<domain>.constants.ts` | Regex, enums, static config — never inline magic values |
| `<domain>.types.ts` | TypeScript types scoped to this module |
| `<domain>.service.unit.test.ts` | Unit tests bootstrapped with `Test.createTestingModule` |

### Module file

Register the service in both `providers` and `exports` so consumers can inject it:

```ts
@Module({
  controllers: [],
  exports: [MyDomainService],
  imports: [TypeOrmModule.forFeature([MyEntity]), LoggerModule],
  providers: [MyDomainService],
})
export class MyDomainModule {}
```

Add a JSDoc comment on the module class describing what domain it owns.

### Service file

Follow the section-comment layout from the template — it keeps large services scannable:

```ts
@Injectable()
export class MyDomainService {
  // 🏗 Dependency Injection
  constructor(
    @InjectRepository(MyEntity)
    private readonly repo: Repository<MyEntity>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(MyDomainService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods
}
```

Key rules:

- **Call `setContext` in every constructor** — always use `MyClass.name`, never a string literal.
- **Inject `LoggerService` as the last constructor parameter** (after repository/domain deps).
- **Private first** — keep internal helpers in the `🔏 Private Methods` section, expose only what callers need under `🌎 Public Methods`.
- **`readonly` everything in the constructor** — all injected deps must be `private readonly`.
- **One service per module** — if a service grows too large, extract a sub-domain into its own module.

### Constants file

Move all inline values to `.constants.ts` to keep services readable:

```ts
// ♟️ Constants
export const MY_SKIP_REGEX = /(alternative)|(archaic)|(synonym)/i;
export const DEFAULT_PAGE_SIZE = 100;
```

### Types file

Put all module-local TypeScript types and interfaces in `.types.ts`:

```ts
// 🏷️ Types
export interface ParsedEntry {
  word: string;
  partOfSpeech: string;
}
```

Do not re-export types from `index.ts` unless they are part of the public API consumed by other modules.

### Registering in the root module

After generating a module, import it in `main.module.ts`:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    LoggerModule,
    MyDomainModule,   // ← add here
  ],
  providers: [],
})
export class MainModule {}
```

### Conformetry validation

Conformetry validation measures generated and existing module structures against the templates they came from. It runs for one project, or for every project at once.

```bash
pnpm nx run-many --targets=conformetry-validate
```

## Best Practices

- **Never** put business logic in `main.ts` — it bootstraps `CommandFactory` only.
- **One command per class** — split sub-commands into separate `CommandRunner` subclasses.
- **Validate at the boundary** — all env vars must be declared in `environmentSchema`; access via `ConfigService`, not `process.env`.
- **Type imports** — use `import { type Foo }` for type-only imports (enforced by ESLint).
- **No `any` types** — use `unknown` or proper typing; strict mode is enabled.

See the [write-typescript skill](../../.agents/skills/write-typescript/SKILL.md) for strict mode patterns.

## Troubleshooting

- **Command not found at runtime** — ensure the command class is listed in `providers` of its module and the module is imported by the root module.
- **Dependency injection failure** — verify the service is `@Injectable()`, exported from its module, and that module is imported by the consuming module.
- **Unrecognized CLI flag** — check that `@Option()` decorators in the command class exactly match the flag names passed.
- **Env var validation error on startup** — add the missing variable to `environmentSchema` in `src/constants.ts` and to `.env.default`.

See the [triage-integration skill](../../.agents/skills/triage-integration/SKILL.md) for lint and git hook failures.

## Key Files

- [src/main.ts](src/main.ts): Application bootstrap
- [src/main.module.ts](src/main.module.ts): Root NestJS module
- [src/constants.ts](src/constants.ts): `environmentSchema` (Zod)
- `@codebase/logging` (`packages/logging`): shared pino-backed `LoggerService` and `LoggerModule`
- [project.json](project.json): Nx targets (`develop`, `build`, `test`, `lint`, `typecheck`, `format`)
- [.env.default](.env.default): Environment variable template
