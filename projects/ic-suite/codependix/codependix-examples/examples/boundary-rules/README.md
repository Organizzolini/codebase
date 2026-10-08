# 🚧 The three boundary rule kinds

The three rule kinds `--check boundaries` gates, judged by the real evaluator — and the two properties that decide what a report is allowed to leave out.

## Run it

```bash
nx run codependix-examples:examples
```

Everything below is rendered from the subject in this directory by the real
graph builders, so a claim that stops being true fails a check rather than
misleading anybody. The command above fails if what is committed here has
drifted; `:write` regenerates it.

## `forbid` — an edge that must not exist

Nothing is reported: no application depends on another. A rule that matches nothing is not an error, and neither is one everything satisfies — a workspace that has not yet grown the code a rule was written for should not be failed for it.

```text
No boundary violations.
```

## `allow` — the whole surface a node may reach

The mirror image of `forbid`: every edge leaving `atlas-service` for anywhere outside `atlas-core` is reported. The one caught here is `atlas-tooling`, reached through an Nx `implicitDependencies` entry — a project-graph edge with no import statement, which is the fact `@nx/enforce-module-boundaries` structurally cannot see.

```text
1 boundary violation across 1 rule.
nxProjects workspace: atlas-service-reaches-core-only: atlas-service may not depend on atlas-tooling, which the rule's allowed targets do not cover. The service composes the core and nothing else.
```

## `acyclic` — a shape rather than an edge

The whole path is named, not only the edge that closed it, and one tangle is reported once rather than once per node it passes through. This is the rule kind no per-file lint rule can express: a cycle is a statement about a graph.

```text
1 boundary violation across 1 rule.
nxProjects workspace: no-project-cycles: atlas-service → atlas-core → atlas-service is a cycle. Two projects that depend on each other cannot be built apart.
```

## A rule's `message` is appended, never substituted

The generated half names the rule and both endpoints; the configured half says why it matters. Appending rather than replacing is what stops any wording a configuration chooses from costing the report the two things it must always carry. Note also which edge is _not_ reported — a service importing its own types is the direction that works.

```text
1 boundary violation across 1 rule.
typescript atlas-service: types-files-do-not-reach-services: src/catalog.types.ts must not depend on src/settings.service.ts. Types are the leaf of a module.
```

## A selector's fields narrow each other

The same rule as above with a `project` field added reports nothing, because every field a selector states must match. Within one field, one glob matching is enough. A selector naming a field its level does not carry — `path` at the NestJS level, where a module is a class name and nothing else — matches nothing rather than everything.

```text
No boundary violations.
```

## Next

[refusals](../refusals/README.md).
