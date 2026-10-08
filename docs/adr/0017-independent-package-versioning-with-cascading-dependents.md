# Independent package versioning with cascading dependents

The 29 publishable packages across the four IC suites (`conformetry`,
`codometer`, `callidescope`, and `codependix`) are versioned independently using
Nx Release (`nx release`), rather than in lockstep across the repository or per
suite. Conventional commits determine semver bump specifiers for every package a
commit affects, which reaches past each package's own files as
[ADR 0023](0023-version-packages-by-everything-a-commit-affects.md) records, and
Nx Release automatically cascades patch version bumps to internal dependent
packages within the publishable packages.

This decouples the release cycle of public npm packages from the monorepo's
internal applications, tools, and root fixed-version releases, while guaranteeing
internal consistency across multi-package suites without manual bump tracking.

## Relationship to repository release tier

Releases in this repository operate at two distinct tiers:

1. **Repository root release:** The root monorepo uses `semantic-release` on
   merges to `main` for fixed-version repository releases, generating root
   changelogs and GitHub release tags (e.g. `v2.20.0`). No packages are
   published to the public npm registry at this tier.
2. **Publishable packages release:** The 29 publishable library packages use
   `nx release` with independent versioning (`projectsRelationship: "independent"`)
   and per-package release tags (e.g. `conformetry-cli@0.1.0`).

## Considered options

- **Repository-wide fixed lockstep versioning for all packages.** Rejected.
  Lockstep versioning would force all 29 packages to bump their versions
  whenever any application, internal tool, or unrelated package changes in the
  monorepo. This creates artificial churn on npm, produces empty changelogs for
  untouched libraries, invalidates consumer caches unnecessarily, and obscures
  which packages actually received functional changes.
- **Suite-level lockstep versioning (one version per toolchain suite).**
  Rejected. Grouping packages by suite (e.g. all `@conformetry/*` packages sharing
  a single version) is less noisy than repository-wide lockstep, but still forces
  unnecessary bumps on stable leaf libraries (such as `conformetry-core` or
  `conformetry-configuration`) when only top-level orchestrators (`conformetry-cli`
  or `conformetry-nx`) change. It also complicates semantic versioning guarantees
  by coupling breaking changes in one package to unrelated siblings.
- **Independent versioning without cascading dependents.** Rejected. While
  independent versioning isolates bumps to changed packages, failing to update
  dependents when an internal dependency changes causes version drift.
  Downstream consumers installing the latest CLI or plugin would receive stale
  dependency constraints or encounter runtime mismatches unless maintainers
  manually track and bump all reverse dependencies.
- **Independent versioning with automated cascading dependents via Nx Release.**
  Chosen. Each publishable package computes its own semver bump based on the
  commits that affect it, as ADR 0023 describes. When a dependency package is
  bumped, Nx Release automatically cascades a patch version bump (`updateDependents: "auto"`) and updates
  manifest dependency constraints across all internal dependents.

## Consequences

- **Per-package git tags and changelogs:** Every package in the publishable packages
  generates an independent git tag matching pattern `{projectName}@{version}`
  (such as `codometer-core@0.1.0`) and maintains its own release notes.
- **Automated suite consistency:** Changing a core library (such as
  `@conformetry/core`) automatically increments the patch version of dependent
  packages (such as `@conformetry/generation`, `@conformetry/validation`, and
  `@conformetry/cli`), ensuring consumers always receive compatible dependency
  ranges upon publication.
- **Explicit unpublished package exclusions:** The 8 non-publishable packages
  across the four suites (`*-agents` and `*-examples`) are explicitly excluded in
  the `release.projects` configuration in `nx.json`, preventing test fixtures or
  internal skill packages from accidentally publishing if a manifest `private`
  flag is cleared.
