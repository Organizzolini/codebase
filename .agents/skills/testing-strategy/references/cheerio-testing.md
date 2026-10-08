# Cheerio Testing Reference

Use this reference when writing or refactoring tests that parse HTML or XML with Cheerio in this codebase.

## Goals

- Prefer real Cheerio documents over module-level mocking.
- Keep DOM setup deterministic and explicit per test case.
- Reuse shared helpers from the project test utilities instead of copy/paste setup blocks.

## Current Standard In Lexico Ingestion

For lexico-cli tests, helper functions are defined in:

- `projects/lexico/lexico-cli/testing/mocks.ts`

Cheerio helper section:

- `loadCheerioWithRoot(html: string)`
- `loadCheerioXmlWithRoot(xml: string)`
- `loadCheerioElement(html: string, selector: string)`
- `loadCheerioXmlElement(xml: string, selector: string)`

From most files under `src/modules/*/`, import with:

```ts
import { loadCheerioElement, loadCheerioWithRoot } from "../../../testing/mocks";
```

Adjust relative depth based on the test file location.

## Recommended Pattern

### HTML Root Parsing

```ts
const { $, rootElement } = loadCheerioWithRoot("<div>content</div>");
const result = service.parse($, rootElement);
```

### HTML Element Parsing

```ts
const { $, element } = loadCheerioElement('<p id="entry">word</p>', "#entry");
const result = parser.parse({ $, elt: element, ...context });
```

### XML Root Parsing

```ts
const { $, rootElement } = loadCheerioXmlWithRoot("<entry><form /></entry>");
const result = provider.parse($, rootElement);
```

## Do And Don’t

- Do: Use helper functions that throw clear errors when required nodes are missing.
- Do: Keep fixture snippets minimal and specific to each assertion.
- Do: Assert behavior, not internal Cheerio implementation details.
- Don’t: Mock Cheerio module exports for routine parser/service unit tests.
- Don’t: Recreate identical `cheerio.load(...)` setup in every test block.

## Coverage Tips For Parser Logic

- Add focused tests for null/undefined and missing-selector branches.
- Cover both “node found” and “node missing” paths for selector helpers.
- Exercise fallback branches with sparse or malformed fixtures.
- Prefer targeted branch tests over broad snapshots.

## Validation Commands

Run project-level checks with Nx:

```bash
pnpm nx run lexico-cli:vitest:unit
pnpm nx run lexico-cli:typecheck
pnpm nx run lexico-cli:lint-code --configuration=check
```

If the task is coverage-driven:

```bash
pnpm nx run lexico-cli:vitest --configuration=coverage
```
