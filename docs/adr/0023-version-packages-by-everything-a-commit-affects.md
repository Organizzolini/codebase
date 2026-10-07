# Version packages by everything a commit affects

A publishable package is versioned by every commit that `nx affected` reaches it
from, not only by commits that edit its own files. Nx Release decides which
packages a commit belongs to with the same logic as `nx affected`:

- files inside a package's folder;
- files in any workspace package it depends on, such as the inlined
  `@codebase/logging`;
- `nx.json`, which Nx treats as touching every project;
- any `{workspaceRoot}` file a target declares as an input, such as the cspell
  dictionaries, `configuration/eslint.config.ts` and
  `configuration/codebase-structure.json`.

So a releasing commit (`feat`, `fix`, `refactor`, `perf` or `build`) that only
edits a shared lint config gives all 28 packages a patch. We keep that: a
needless release costs a few minutes of CI and a "version bump only" changelog
entry, while a missed one leaves a real change unpublished.
[ADR 0017](0017-independent-package-versioning-with-cascading-dependents.md)
described packages as versioned by the commits touching their own paths; this
records what Nx actually does, and that we chose to keep it.

## Considered options

- **Nx version plans.** Rejected. `nx release plan` counts only the files inside
  a package's folder, so tooling changes would stop releasing every package. But
  each pull request would have to carry a plan file, written by a skill and
  checked in CI. Nx would also not see a change to an inlined package as
  touching the packages that compile it in.
- **Filtering the release to packages whose shipped files changed.** Rejected. A
  release script could diff each package's folder and its dependencies' folders
  since its last tag, and pass only those packages to `nx release --projects`.
  That is simpler than version plans, but it replaces Nx's judgement with ours:
  every file the filter wrongly counts as not shipping is a missed release.
- **Removing the shared configs from the targets' inputs.** Rejected. It would
  also stop CI re-checking every project when a lint config changes, since
  pull requests use the same affected logic.

## Consequences

- A releasing commit that changes `nx.json`, the lockfile or a shared lint
  config patch-bumps all 28 packages. All six releasing commits between
  v2.33.5 and v2.33.6 did this.
- Such a release takes longer than one that bumps a few packages: every build
  misses the cache, and the release commit's pre-commit hook checks every bumped
  package. The release job's timeout is sized for it.
- A package that releases for a real change also lists the tooling commits since
  its last tag in its changelog.
