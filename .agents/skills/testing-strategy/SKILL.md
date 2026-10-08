---
name: testing-strategy
description: "Use codebase testing conventions: unit, integration, end-to-end test naming and Nx commands, plus the four gates a change must clear — test coverage, type coverage, compiled size, and advisory duplication. Use when adding tests, recommending test coverage, running type-coverage, or checking which quality gates a touched project has to pass."
license: MIT
---

# Testing Strategy

This skill describes the codebase testing model and naming conventions.

## When to Use This Skill

Use when asked to:

- Add tests or choose test types
- Name test files correctly
- Run tests via Nx
- Recommend coverage or test scope

## Test Types and Naming

- Unit: `*.unit.test.ts`
- Integration: `*.integration.test.ts`
- End-to-end: `*.end-to-end.test.ts`

## Run Tests

```bash
nx run <project>:vitest:unit
nx run <project>:vitest:integration
nx run <project>:vitest:end-to-end
nx affected --target=vitest --base=main
```

## Coverage Verification

When a task includes coverage goals (or CI enforces coverage thresholds), run:

```bash
nx run <project>:vitest --configuration=coverage
```

Key practice: after structural test refactors (renaming, regrouping, helper extraction), always re-run coverage to verify no threshold regression.

If branch coverage is just below threshold, add focused tests for uncovered guard/fallback branches first (for example undefined/null guards, sparse-array fallbacks, and error-only paths).

Additional coverage practices from recent 96% threshold work:

- Keep project Vitest configs thin and inherit shared defaults using `mergeConfig(...)` from `configuration/vitest.config.ts` so threshold changes stay centralized.
- Use a hotspot-first loop: generate coverage, sort the lowest branch-coverage files, patch the highest-impact offenders, then re-run coverage.
- Raise coverage with behavior-first assertions, not synthetic test inflation. Prioritize guard clauses, empty-result paths, fallback branches, and explicit error paths.
- Add dedicated branch-focused test files for services with dense branching logic so intent stays explicit and regressions are easier to detect after refactors.
- Prefer deterministic fixtures and fixed clocks for time-sensitive or orbital/math-heavy logic to keep branch tests stable.
- For orchestration services, combine focused unit tests with a small set of integration tests that verify cross-service error propagation and empty-data behavior.
- Include module wiring and constants/types-adjacent smoke tests where needed so structural files do not remain persistent blind spots under strict thresholds.
- Before opening or updating a coverage-focused PR, run the CI-shaped command locally: `nx affected --target=vitest --configuration=coverage --base=main`.

## The other gates beside test coverage

Test coverage is one of four numbers a change has to clear. Passing `vitest`
proves nothing about the other three, so run each one that applies to a project
you touched.

| Gate | Threshold | How to run |
| ---- | --------- | ---------- |
| Test coverage | 96% branches, functions, lines, statements — set once in `configuration/vitest.config.ts` | `nx run <project>:vitest --configuration=coverage` |
| Type coverage | Per project, in that project's own `package.json` as `typeCoverage.atLeast`. Most packages sit at 100 with `strict: true` | `nx run <project>:type-coverage` |
| Compiled size | Per project, declared in its own `codometer.config.ts`. Only projects that emit something declare one | `nx run <project>:codometer` |
| Duplication | **Not a gate.** Advisory only, and nothing in CI runs it | `nx run codebase:jscpd` |

**Type coverage is the one most often forgotten**, because `typecheck` passing
looks like the same assurance and is not. `typecheck` asks whether the types are
consistent; `type-coverage` asks how much of the code is actually typed. A
project can pass the first at 88% coverage and fail the second. The workspace
root is the one exception to the manifest rule — its 95 is a `--at-least` flag
on the root `type-coverage` target in `project.json`, not a manifest field.

**Compiled size lives with codometer**, not here. A breach names the project and
fails the build pipeline; the `codometer-triage` skill covers what to do about
it, and `codometer-configure` covers declaring a target and its limit. The short
version is the same as any limit: reduce what is measured, never raise the
number on the change that broke it.

**Lowering any of these thresholds to make a change pass is not an option.**

## Mocking with `createMock`

Use `@golevelup/ts-vitest`'s `createMock<T>()` to auto-mock any TypeScript class or interface. It returns a fully-typed `DeepMocked<T>` where every method is a `vi.fn()` and every property is recursively mocked via `Proxy`. Never write manual stub objects — `createMock` eliminates the maintenance burden and stays in sync with the source type automatically.

```ts
import { createMock } from "@golevelup/ts-vitest";
import type { DeepMocked } from "@golevelup/ts-vitest";
```

### Mocking TypeORM repositories in NestJS unit tests

Provide mocked repositories through Nest's DI system using `getRepositoryToken(Entity)` as the provider token. Never put repository mocks inside `imports:[]` — they belong in `providers:[]`.

```ts
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { DeepMocked } from "@golevelup/ts-vitest";
import type { Repository } from "typeorm";

const module = await Test.createTestingModule({
  imports: [LoggerModule],
  providers: [
    MyService,
    {
      provide: getRepositoryToken(MyEntity),
      useValue: createMock<Repository<MyEntity>>() satisfies DeepMocked<Repository<MyEntity>>,
    },
  ],
}).compile();
```

The `satisfies DeepMocked<Repository<T>>` annotation gives ESLint's type-aware rules a concrete type, preventing `unsafe-call` / `unsafe-assignment` false positives.

**Required `tsconfig.json` `paths` entry** for each NestJS project (ESLint's project service needs this to resolve the package's `.d.ts`):

```json
"paths": {
  "@golevelup/ts-vitest": [
    "./node_modules/@golevelup/ts-vitest/lib/index.d.ts"
  ]
}
```

### Mocking other services and dependencies

The same pattern applies to any injected class — services, clients, loggers, etc.:

```ts
{
  provide: MyOtherService,
  useValue: createMock<MyOtherService>(),
},
```

To configure mock return values in specific tests:

```ts
let service: MyService;
let repository: DeepMocked<Repository<MyEntity>>;

beforeAll(async () => {
  const module = await Test.createTestingModule({ ... }).compile();
  service = module.get(MyService);
  repository = module.get(getRepositoryToken(MyEntity));
});

it("finds an entity", async () => {
  repository.findOneBy.mockResolvedValue(myFixture);
  const result = await service.findOne(1);
  expect(result).toStrictEqual(myFixture);
});
```

## Cheerio Testing

Use Cheerio helpers when tests parse HTML/XML (especially parser/service tests) and repeated `cheerio.load(...)` setup appears.

- **When**: Unit tests that need deterministic DOM setup, selector-based parsing, root-node parsing, and branch coverage for missing-node guards.
- **How**: Prefer shared helpers over inline setup and avoid module-level Cheerio mocks for routine parsing tests.
- **Where (lexico-cli)**: import helpers from `applications/lexico/lexico-cli/testing/mocks.ts` and keep fixtures minimal and behavior-focused.

See the full guide with examples, do/don't guidance, and coverage tips: [Cheerio Testing Reference](./references/cheerio-testing.md).

## References

- [testing-mocks skill](../testing-mocks/SKILL.md)
- [Vitest documentation](https://vitest.dev/)
- [Cheerio Testing Reference](./references/cheerio-testing.md)
