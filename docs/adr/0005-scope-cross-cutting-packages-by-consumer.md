# Scope a cross-cutting package by the application consuming it

A shared package that serves the whole workspace gets no scope of its own in
the conventional vocabulary. A change to it is scoped by the application that
prompted the change. `logger` was removed as a scope for this reason, and the
shared entities package extracted from `lexico-entities` is never added as one.

A package that belongs to a **domain** keeps its own scope. `lexico-entities`
has one and keeps it, so the extraction that creates the shared package is
`feat(lexico-entities)`.

The line is domain membership, not shared-ness. Both kinds of package are
shared, so "is it shared?" cannot decide it — the question is whether the
package belongs to one domain or to the workspace.

## Considered options

- **Give every shared package its own scope.** This is what the workspace did
  before, and what `lexico-entities` still reflects. Rejected: a scope's job is
  to say what a change is _about_, and `logger` has more than ten consumers
  across caelundas, meanderaw, lexico-cli, and most of the callidescope
  and codependix suites. A commit touching it is almost never about logging —
  it is about whatever made the logging need to change. `chore(logger)` names
  the file that moved, not the work.
- **Remove the scope from every shared package, including `lexico-entities`,
  and fold it under `lexico`.** Rejected: `lexico-entities` has exactly one
  external consumer, so scoping it by consumer would collapse it onto
  `lexico-cli` — which is not what a change to the Latin dictionary's
  schema is about either. A domain package's scope is already specific; there
  is nothing to gain by erasing it.
- **Grandfather the inconsistency.** New shared packages get no scope, existing
  ones keep theirs, and nobody writes down why. Rejected: this is the state
  that prompted the decision, and it reads as drift rather than as a rule.
  Without the distinction above, `feat(lexico-entities)` landing immediately
  after `logger` lost its scope looks like an oversight.

## Consequences

- **Removing a scope is not free.** `configuration/conventional.config.cjs` is
  the single source of truth for commitlint, `validate-branch-name`, the
  release rules, five skill reference tables, `AGENTS.md`, the issue template,
  and `.vscode/settings.json`, all rewritten by
  `nx run synchronization:conventional-config:write`. A branch named for a
  removed scope stops validating the moment the change lands, so check for open
  pull requests and live branches first — `logger` had neither.
- **The `scope:logger` GitHub label outlives the scope.** Nothing deletes a
  label that leaves the vocabulary, and 👮 Audit Issues only checks an issue
  when it is next opened, edited, or labeled. An old issue carrying
  `scope:logger` stays unflagged until someone touches it.
- **A cross-cutting change with no single consumer has no obvious scope.**
  Upgrading pino across every consumer of `logger` is the case with no good
  answer; `chore(dependencies)` or the scope of whichever project drove the
  upgrade are both defensible. This is the cost of the rule, accepted because
  that change is rare and the per-consumer change is common.
- **Cross-cutting packages still carry their own Nx project, tags, README, and
  codometer limits.** Only the commit scope is affected. Nothing about how the
  package is built, tested, or measured changes.
