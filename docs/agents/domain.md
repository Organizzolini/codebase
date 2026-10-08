# Domain Docs

How the engineering skills should consume this repository's domain documentation when exploring the codebase.

**This repository is configured single-context**: one `CONTEXT.md` at the root and one `docs/adr/` directory. Neither exists yet — `/domain-modeling` creates them lazily, as described below. Do not create them upfront.

Two repository-specific notes:

- **ADRs are always root-level.** A project subfolder set is enforced by `eslint-plugin-project-structure` (see [AGENTS.md](../../AGENTS.md)), and `docs/` is not in it — so a per-project `projects/<name>/docs/adr/` is a lint error. Every ADR goes in the root `docs/adr/`, whatever its scope.
- **Ignore the `src/<context>/` paths** in the multi-context example below. This workspace nests projects under `projects/`, not `src/`. The example is upstream's and is kept only for reference should this repository ever switch to multi-context.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
