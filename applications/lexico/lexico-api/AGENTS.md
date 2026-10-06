# LexicoApi: NestJS GraphQL API

## Quick Start

**Type**: Node.js HTTP API server (NestJS + Apollo GraphQL)

**Purpose**: <!-- Briefly describe the specific purpose of this GraphQL API -->

### Run Locally

```bash
cp .env.default .env  # Fill in required environment variables
nx run lexico-api:start
```

## Architecture Overview

### Tech Stack

- **Framework**: NestJS (modules, dependency injection, providers)
- **GraphQL server**: Apollo Server via `@nestjs/apollo` (`ApolloDriver`)
- **Schema strategy**: Code-first, emitted to `src/schema.gql` beside the root module (`GRAPHQL_SCHEMA_FILE`), whatever the working directory; the file is gitignored
- **Pagination**: Relay connections via `nestjs-graphql-connection`
- **Dataloaders**: `dataloader` (request-scoped, prevents N+1 queries)
- **Env validation**: `@nestjs/config` + `zod` (`environmentSchema` in `.constants.ts`)
- **Logging**: `@codebase/logging` — a `pino`-backed `LoggerService` (`Scope.TRANSIENT`)
- **Language**: Strict TypeScript

### Execution Flow

```text
src/main.ts
  └─ NestFactory.create(LexicoApiModule)
       └─ GraphQLModule.forRoot(ApolloDriver)
            └─ Feature modules (SampleModule, ...)
                 └─ Resolvers → Services → Loaders
```

### Directory Layout

```text
src/
  main.ts                             # Bootstrap — do not modify
  modules/
    lexico-api/
      lexico-api.module.ts     # Root NestJS module (imports GraphQLModule, LoggerModule)
      lexico-api.constants.ts  # Zod environmentSchema for env validation
      lexico-api.types.ts      # Module-scoped TypeScript types
    sample/                           # Example GraphQL module — replace with your domain
      sample.module.ts
      sample.resolver.ts
      sample.service.ts
      sample.loader.ts
      sample.entities.ts
      sample.inputs.ts
      sample.args.ts
      sample.factories.ts
      sample.constants.ts
      sample.types.ts
      sample.*.unit.test.ts
    <domain>/                         # Add feature modules here
      <domain>.module.ts
      <domain>.resolver.ts
      <domain>.service.ts
      <domain>.loader.ts
      <domain>.entities.ts
      <domain>.inputs.ts
      <domain>.args.ts
      <domain>.factories.ts
      <domain>.constants.ts
      <domain>.types.ts
      <domain>.<tier>.test.ts
testing/                              # Shared test utilities
```

## Development

### Adding Domain Modules

Use the generator to scaffold new GraphQL modules, then implement the resolver and service:

```bash
nx g conformetry:nestjs-graphql-module --name=<domain>
```

This creates 13 files in `src/modules/<domain>/`. After generation:

1. **Register in root module** — import the new module in `lexico-api.module.ts`:

   ```ts
   @Module({
     imports: [
       ConfigModule.forRoot({ ... }),
       GraphQLModule.forRoot<ApolloDriverConfig>({ ... }),
       LoggerModule,
       MyDomainModule,   // ← add here
     ],
   })
   export class LexicoApiModule {}
   ```

2. **Implement the resolver** — add queries and mutations in `<domain>.resolver.ts`.
3. **Implement the service** — add business logic in `<domain>.service.ts`.
4. **Implement the dataloader** — add batch loading in `<domain>.loader.ts`.
5. **Define entities** — add GraphQL object types in `<domain>.entities.ts`.

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

### GraphQL Playground

The GraphQL playground is available at `http://localhost:3000/graphql` in development.
Disabled automatically in production (`NODE_ENV=production`).

### Key Commands

Always prefer running tasks through Nx rather than calling the underlying tools directly.

```bash
nx run lexico-api:start           # Start the GraphQL API server
nx run lexico-api:typecheck-code,lint-code,format-code,deprecate-code,guard-code   # Every static check, in one graph
nx run lexico-api:typecheck       # tsc --noEmit
nx run lexico-api:oxfmt           # Formatting
```

### Testing

Follow the codebase's strict three-tier testing strategy. Co-locate test files with the source they test.

```bash
nx run lexico-api:vitest:unit          # Fast (<100ms) — pure logic, mocked DI
nx run lexico-api:vitest:integration   # Moderate (1-2s) — real database/API I/O
nx run lexico-api:vitest:end-to-end    # Slow (30-60s) — full server execution
```

| Tier        | File pattern            | What to test                                       |
| ----------- | ----------------------- | -------------------------------------------------- |
| Unit        | `*.unit.test.ts`        | Resolver methods, service methods with mocked deps |
| Integration | `*.integration.test.ts` | Database queries, external API clients             |
| End-to-end  | `*.end-to-end.test.ts`  | Full GraphQL request/response cycles               |

See the [testing-strategy skill](../../../.agents/skills/testing-strategy/SKILL.md) and [testing-mocks skill](../../../.agents/skills/testing-mocks/SKILL.md) for patterns and mock conventions.

## Writing GraphQL Modules

### Resolver file

Use section comments to keep resolvers scannable:

```ts
@Resolver(() => MyEntity)
export class MyResolver {
  // 🏗 Dependency Injection
  constructor(
    private readonly myLoader: MyLoader,
    private readonly myService: MyService,
  ) {}

  // 🔎 Queries

  @Query(() => MyConnection)
  async myEntities(@Args() args: FindMyArgs): Promise<MyConnection> {
    // ...
  }

  // 🖋️ Mutations

  @Mutation(() => MyEntity)
  async createMyEntity(@Args("input") input: CreateMyInput): Promise<MyEntity> {
    // ...
  }

  // 🔗 Relations
}
```

### DataLoader pattern

Use DataLoaders for all relation fields to avoid N+1 queries:

```ts
@ResolveField(() => RelatedEntity)
async relatedEntity(
  @Parent() parent: MyEntity,
): Promise<RelatedEntity | null> {
  return this.relatedLoader.byId.load(parent.relatedId);
}
```

### Relay Connections

Use `nestjs-graphql-connection` for all list queries:

```ts
@Query(() => MyConnection)
async myEntities(@Args() args: FindMyArgs): Promise<MyConnection> {
  const { first, after } = args;
  const items = await this.myService.findAll({ first, after });
  return buildConnection(items);
}
```

### Module file

Register the resolver, service, and dataloader in both `providers` and `exports`:

```ts
@Module({
  exports: [MyLoader, MyService],
  imports: [],
  providers: [MyLoader, MyResolver, MyService],
})
export class MyModule {}
```

Add a JSDoc comment on the module class describing what domain it owns.

### Service file

Follow the section-comment layout — keeps large services scannable:

```ts
@Injectable()
export class MyService {
  // 🏗 Dependency Injection
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(MyService.name);
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
- **Private first** — keep internal helpers in the `🔏 Private Methods` section.
- **`readonly` everything in the constructor** — all injected deps must be `private readonly`.

## Best Practices

- **Never** put business logic in `main.ts` — it bootstraps `NestFactory` only.
- **One module per domain** — split large domains into sub-domain modules.
- **Validate at the boundary** — all env vars must be declared in `environmentSchema`; access via `ConfigService`, not `process.env`.
- **Use DataLoaders for relations** — never load related entities inside resolver field methods without batching.
- **Type imports** — use `import { type Foo }` for type-only imports (enforced by ESLint).
- **No `any` types** — use `unknown` or proper typing; strict mode is enabled.

See the [write-typescript skill](../../../.agents/skills/write-typescript/SKILL.md) for strict mode patterns.

## Troubleshooting

- **Resolver not found at runtime** — ensure the resolver class is listed in `providers` of its module and the module is imported by the root module.
- **Dependency injection failure** — verify the service is `@Injectable()`, exported from its module, and that module is imported by the consuming module.
- **GraphQL schema not generating** — ensure `autoSchemaFile` is set to `GRAPHQL_SCHEMA_FILE` in `GraphQLModule.forRoot()` and all types use `@ObjectType()`, `@Field()`, etc.
- **N+1 query problem** — use DataLoaders for all relation fields in resolvers.
- **Env var validation error on startup** — add the missing variable to `environmentSchema` in `.constants.ts` and to `.env.default`.

See the [triage-integration skill](../../../.agents/skills/triage-integration/SKILL.md) for lint and git hook failures.

## Key Files

- [src/main.ts](src/main.ts): Application bootstrap
- [src/modules/lexico-api/lexico-api.module.ts](src/modules/lexico-api/lexico-api.module.ts): Root NestJS module
- [src/modules/lexico-api/lexico-api.constants.ts](src/modules/lexico-api/lexico-api.constants.ts): `environmentSchema` (Zod)
- `@codebase/logging` (`packages/logging`): shared pino-backed `LoggerService` and `LoggerModule`
- [src/modules/sample/sample.module.ts](src/modules/sample/sample.module.ts): Example GraphQL module
- [project.json](project.json): Nx targets (`start`, `test`, `lint`, `typecheck`, `format`)
- [.env.default](.env.default): Environment variable template
