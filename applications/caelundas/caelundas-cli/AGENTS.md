# Caelundas: NestJS Command-Line Application

## Quick Start

**Type**: Node.js CLI application (NestJS + `nest-commander`)

**Purpose**: <!-- Briefly describe the specific purpose of this CLI application -->

Generate astronomical event calendars using NASA's JPL Horizons API (Outputs: iCalendar `.ics` and JSON files)

### Run Locally

```bash
cp .env.default .env  # Fill in required environment variables
nx run caelundas-cli:start
```

## Architecture Overview

### Tech Stack

- **Framework**: NestJS (modules, dependency injection, providers)
- **CLI runner**: `nest-commander` (`CommandRunner` + `@Command()` decorator)
- **Env validation**: `@nestjs/config` + `zod` (`environmentSchema` in `.constants.ts`)
- **Logging**: `@codebase/logging` — a `pino`-backed `LoggerService` (`Scope.TRANSIENT`)
- **Database**: Postgres via TypeORM and `@codebase/database` (the `calendar_events` table)
- **Language**: Strict TypeScript

### Execution Flow

```text
src/main.ts
  └─ CommandFactory.run(MainModule)
       └─ domain command modules            ← add under src/modules/
```

**Project Implementation**:

```text
src/main.ts
  └─ CommandFactory.run(MainModule)
       └─ CaelundasCommand.run()
            ├─ Input (ENV) Validation      ← InputService.parse()
            ├─ Swiss Ephemeris             ← EphemerisService (via Perfective/Progressive)
            ├─ Perfective Event Detection  ← PerfectiveService.detect()
            ├─ Progressive Event Synthesis ← ProgressiveService.detect()
            ├─ Store Events                ← CalendarEventsService.upsert()
            ├─ Read Back Range + Location  ← CalendarEventsService.findInRange()
            └─ iCal and JSON Output        ← CalendarService.write() / writeJson()
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

**Project Domain Modules**:

```text
src/modules/
  input/                               # Zod environmentSchema and config parsing
  calendar/                            # ICS and JSON file output formatting
  caelundas-database/                  # Postgres connection, CalendarEvent entity, migrations
  calendar-events/                     # Upsert and range queries over the calendar_events table
  ephemeris/                           # Swiss Ephemeris access
  perfective/                          # Exact moment event detection (aspects, phases)
  progressive/                         # Duration event synthesis (retrogrades)
  math/                                # Astronomical math utilities
  <domain>/                            # Other specialized astronomical domain modules
```

**Key Domain Components**:

- **Input Validation** ([input.constants.ts](src/modules/input/input.constants.ts)): Zod schema for environment variables
- **Ephemeris Retrieval** ([ephemeris/](src/modules/ephemeris/)): Swiss Ephemeris, computed locally
- **Event Storage** ([calendar-events/](src/modules/calendar-events/) and [caelundas-database/](src/modules/caelundas-database/)): Upserts detected events into Postgres and reads them back by range and location
- **Event Detection** ([perfective/](src/modules/perfective/) and domain modules): Aspects, phases, eclipses, retrogrades
- **Progressive Synthesis** ([progressive/](src/modules/progressive/)): Pairs start/end moments into calendar events
- **Output** ([calendar/](src/modules/calendar/)): iCal and JSON files, rendered from the stored rows

### Event Types

- **Aspects**: Conjunctions (0°), oppositions (180°), squares (90°), trines (120°), sextiles (60°)
- **Phases**: New moon, full moon, first/last quarters
- **Retrogrades**: Apparent backward motion of planets
- **Eclipses**: Solar and lunar
- **Ingresses**: Planets entering zodiac signs
- **Cycles**: Solstices, equinoxes, moonrise/moonset, sunrise/sunset, twilights

## Domain Knowledge

Astronomical concepts, event detection, and storage:

- Swiss Ephemeris computes positions locally from JPL DE431 data files; there are no network calls or rate limits
- Aspects, retrogrades, and phases are detected in two passes: perfective (the exact moment) and progressive (the span around it)
- Detected events are stored in the `calendar_events` table, keyed by summary, start, latitude, and longitude, so a re-run updates rows in place and a second location adds its own
- A range's files are rendered from the rows `findInRange` returns, using overlap semantics so an event spanning a range edge is included

## Development

### Adding Business Logic

1. **Implement the root command** — add logic to `caelundas.command.ts` `run()`, or delegate to injected services.
2. **Add domain command modules** — create `src/modules/<domain>/` with a NestJS module, command, service, types, and constants.
3. **Register in root module** — import the new module in `main.module.ts`.
4. **Validate env vars** — extend `environmentSchema` in `constants.ts` with all required environment variables.

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
nx run caelundas-cli:start           # Run the command-line application
nx run caelundas-cli:typecheck-code,lint-code,format-code,deprecate-code,guard-code   # Every static check, in one graph
nx run caelundas-cli:typecheck       # tsc --noEmit
nx run caelundas-cli:oxfmt           # Formatting
```

### Testing

Follow the codebase's strict three-tier testing strategy. Co-locate test files with the source they test.

```bash
nx run caelundas-cli:vitest:unit          # Fast (<100ms) — pure logic, mocked DI
nx run caelundas-cli:vitest:integration   # Moderate (1-2s) — real database/API I/O
nx run caelundas-cli:vitest:end-to-end    # Slow (30-60s) — full CLI execution
```

| Tier | File pattern | What to test |
| ---- | ------------ | ------------ |
| Unit | `*.unit.test.ts` | Pure functions, service methods with mocked deps |
| Integration | `*.integration.test.ts` | Database queries, external API clients |
| End-to-end | `*.end-to-end.test.ts` | Full `CommandFactory.run()` execution |

See the [testing-strategy skill](../../../.agents/skills/testing-strategy/SKILL.md) and [testing-mocks skill](../../../.agents/skills/testing-mocks/SKILL.md) for patterns and mock conventions.

### Environment Variables

Required:

- `START_DATE`, `END_DATE`: YYYY-MM-DD (inclusive range)
- `LATITUDE`, `LONGITUDE`: Decimal degrees
- `TIMEZONE`: IANA timezone (e.g., "America/New_York")

Optional:

- `EVENT_TYPES`: Comma-separated list (defaults to all)
- `OUTPUT_FORMAT`: `ical` or `json` (defaults to `ical`)
- `OUTPUT_DIRECTORY`: Directory path (defaults to `./output`)

Full schema: [src/modules/input/input.constants.ts](src/modules/input/input.constants.ts)

### Database

Postgres, in the `caelundas_development` database and `caelundas` schema, with one table:

- `calendar_events` (entity `CalendarEvent`): Detected calendar events, extending the shared `UpdatableEntity`. Columns: `summary`, `description`, `start`/`end` (`timestamptz`), `categories` (`text[]`, GIN-indexed), nullable `color` and `location`, and `latitude numeric(8,6)` / `longitude numeric(9,6)`. Unique on `(summary, start, latitude, longitude)`

The stored row is the entity `CalendarEvent`; the detected, in-memory event every detector returns stays the `Event` type in `calendar.types.ts`. `toEvent` in `calendar-events.utilities.ts` turns a row back into an `Event`.

Connection variables are `CAELUNDAS_POSTGRES_HOST`, `_PORT`, `_USERNAME`, `_PASSWORD`, `_DATABASE`, and `_SCHEMA`; the unprefixed `POSTGRES_*` are never read. Postgres returns `numeric` as strings, so compare coordinates as strings.

```bash
nx run caelundas-cli:migration:run        # Apply pending migrations
nx run caelundas-cli:migration:generate   # Generate the next migration from the entities
```

The `migration` target reads its data source and migrations from `src/modules/caelundas-database/`, named by its `module` option. Migrations never run on application start. `CalendarEventsService.upsert` batches rows under Postgres's 65,535-parameter limit and uses `ON CONFLICT … DO UPDATE`.

Inspect: `docker exec -it postgres psql -U caelundas_username -d caelundas_development`

## Kubernetes Deployment

### Architecture

Caelundas runs as a **Kubernetes Job** (not Deployment):

- Single execution, terminates on completion
- Output stored in PersistentVolumeClaim
- No network exposure needed

### Workflow

```bash
# 1. Build and push image
nx run caelundas-cli:docker-build
docker push ghcr.io/organizzolini/caelundas:latest

# 2. Deploy Job (auto-generated release name)
nx run caelundas-cli:helm-upgrade

# 3. Monitor completion
kubectl wait --for=condition=complete job/<job-name> --timeout=600s

# 4. Retrieve output files
nx run caelundas-cli:kubernetes-copy-files

# 5. Clean up
nx run caelundas-cli:helm-uninstall
kubectl delete pvc caelundas-output
```

### Helm Chart

Uses [infrastructure/helm/kubernetes-job](../../../infrastructure/helm/kubernetes-job) - reusable chart for batch jobs with PVC storage.

**Values**: [infrastructure/helm/kubernetes-job/values/caelundas-production.yaml](../../../infrastructure/helm/kubernetes-job/values/caelundas-production.yaml)

See [kubernetes-deployment skill](../../../.agents/skills/kubernetes-deployment/SKILL.md) for Helm chart details.

### Environment Variables in K8s

Stored as Kubernetes Secret (`caelundas-env-secret`):

```bash
kubectl apply -f applications/caelundas/caelundas-cli/kubernetes/secret.yaml
```

## Docker Workflow

### Build

```bash
nx run caelundas-cli:docker-build  # Builds for linux/amd64
```

**Platform targeting**: Always use `linux/amd64` for K8s deployment (Apple Silicon compatibility).

See [docker-workflows skill](../../../.agents/skills/docker-workflows/SKILL.md) for multi-stage builds and GHCR integration.

### Dockerfile

Single-stage build:

- Base: Node.js 20 Alpine
- Native deps: python3, make, g++ (for native modules)
- Workspace: Full codebase copied (needed for path resolution)
- Entry: `pnpm start` (runs TypeScript directly via tsx)

## Performance

**Execution times** (1-year range, all event types):

- 1-2 minutes of local computation, plus a quick upsert and read back

**Optimization strategies**:

- Temporal margins: Fetch beyond date boundaries to catch edge events
- Lazy evaluation: Minute-resolution only for detected event windows

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
- **Class-only top level** — keep NestJS class files to imports plus the class declaration only. Move helper interfaces/types to `<domain>.types.ts`, constants/init helpers to `<domain>.constants.ts` or class members, and do not re-export aliases or types from `*.service.ts`.

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

After generating a module, import it in main.module.ts:

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

See the [write-typescript skill](../../../.agents/skills/write-typescript/SKILL.md) for strict mode patterns.

## Troubleshooting

- **Command not found at runtime** — ensure the command class is listed in `providers` of its module and the module is imported by the root module.
- **Dependency injection failure** — verify the service is `@Injectable()`, exported from its module, and that module is imported by the consuming module.
- **Unrecognized CLI flag** — check that `@Option()` decorators in the command class exactly match the flag names passed.
- **Env var validation error on startup** — add the missing variable to environmentSchema in src/constants.ts and to .env.default.
- **TypeORM entity not found** — register the entity via `TypeOrmModule.forFeature([MyEntity])` in the module that uses it.

See the [triage-integration skill](../../../.agents/skills/triage-integration/SKILL.md) for lint and git hook failures.

**Project-Specific Gotchas**:

- Docker platform mismatch (exec format error)
- K8s Job not starting (image pull, PVC issues)
- PVC cleanup after job completion

## Key Files

- [src/main.ts](src/main.ts): Application bootstrap
- [src/modules/caelundas/caelundas.command.ts](src/modules/caelundas/caelundas.command.ts): Root CLI command
- [src/main.module.ts](src/main.module.ts): Root NestJS module
- [src/constants.ts](src/constants.ts): environmentSchema (Zod)
- `@codebase/logging` (`packages/logging`): shared pino-backed `LoggerService` and `LoggerModule`
- [project.json](project.json): Nx targets (`develop`, `build`, `test`, `lint`, `typecheck`, `format`)
- [.env.default](.env.default): Environment variable template

**Project Files**:

- `caelundas.command.ts` includes pipeline orchestration
- `input.constants.ts` includes Zod validation
- `ephemeris.service.ts` includes NASA API client
- `calendar.service.ts` includes ICS/JSON generation
- `Dockerfile` includes container build config
