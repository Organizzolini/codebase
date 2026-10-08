# 🎛️ Custom statistics, both kinds

The half of codometer no language analyzer can produce: the conventions a
repository holds _itself_ to. A counter carrying `patterns` counts **files**. A
counter carrying `symbols` counts **declarations**. Both are declared in the
same list, and the interesting case is a counter carrying both.

## Run it

```bash
cd examples/corpus
codometer --config ../statistics/codometer.config.ts
```

## What is here

```text
statistics/
└── codometer.config.ts    seven counters, declared in the top-level `custom` array
```

A counter is measured once it is declared in the top-level `custom` array,
regardless of whether any output selects it back out by label. This file
declares no `outputs` entry at all; every counter below is still computed and
printed to the console.

| Counter | Declared as | Result |
| ------- | ----------- | ------ |
| Service Files | `patterns: ["**/*.service.ts"]` | 4 |
| Unit Tests | `patterns: ["**/*.unit.test.ts"]` | 6 |
| Integration Tests | `patterns: [...]`, `color: "16a34a"` | 1 |
| Static Methods | `symbols: { kinds: ["method"], modifiers: ["static"] }` | 4 |
| Static Properties | `symbols: { kinds: ["property"], modifiers: ["static"] }` | 1 |
| Service Static Methods | the same `symbols`, plus `patterns: ["**/*.service.ts"]` | 3 |
| Exported Interfaces | `symbols: { kinds: ["interface"], modifiers: ["export"] }` | 6 |

## `patterns` narrows, it does not count

Read the last two `symbols` rows together. **Service Static Methods is 3, not
4** — the narrowing removed `examples/corpus/javascript/receipt.js`, where the
fourth static method lives. It is still counting methods; `patterns` only said
where to look.

That is the whole rule: on a counter that has both, `patterns` decides _which
files are searched_ rather than what is counted.

## The trap worth knowing

**Static Properties is 1**, not 2. `CatalogService.blank` is written as a class
field holding an arrow function, so it is a property and carries none of a
method's modifiers. Asking for static methods never finds it.

## Two fields that only affect the badge

`color` is a shields.io hexadecimal triplet, and `group` decides which badge
group a counter renders into — `conventions` by default, or any rendered group
by name, which is how Static Methods lands beside the TypeScript badges rather
than under a heading of its own.

## Next

[python](../python/README.md), for the one analyzer that does not run in
process.
