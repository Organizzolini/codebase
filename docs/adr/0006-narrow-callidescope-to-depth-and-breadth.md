# Narrow callidescope to depth and breadth

Callidescope reported four things. Two of them — **module spread** and
**possibly misplaced** — were derived by a cohesion analyzer from a notion of
**module identity** the tool invented for itself: a `<project>:<subtree>`
identifier guessed from a directory layout that a `workspaceStructure`
declaration was there to correct when the guess was wrong. We removed both
findings, the analyzer, module identity, and the four limits that existed only
to tune them. What remains is **depth** and **breadth** — two limits, both per
project, both gated.

The **implementation-candidate cap** was removed as a configuration field but
kept as a constant in `@callidescope/graph`. It is not a limit anything is
judged against: it is the point at which structural interface resolution stops
guessing, and it belongs with the resolution it governs.

## Considered options

- **Keep the cohesion axis and fix it.** Rejected: the two findings gated
  nothing and nobody acted on either. Neither had a `--check` name, neither
  reached the per-project `gate` target, and the workspace's own committed
  report carried a spread row for `CallidescopeService.analyze` — the method
  that produced the finding — for as long as the finding existed. A report row
  nobody is required to clear is a backlog, and this one had been one since it
  was written.
- **Keep the findings but drop module identity, measuring spread over files or
  over projects.** Rejected: a file is too fine to say anything (every callable
  that calls two files "spreads"), and a project is too coarse (an application
  reaching four packages is an application working). The unit that would make
  the finding mean something is the one the tool could not derive without being
  told, which is what `workspaceStructure` was — configuration whose only
  purpose was to make a guess less wrong.
- **Remove the findings and remove the cap with them.** Rejected: the cap is
  not part of the axis. Removing it would follow every structurally assignable
  candidate for an interface member named `run`, `emit`, or `sync`, which moves
  depth measurements upward and unpredictably — and depth is the thing thirty
  eight projects now gate against a boundary-tested number.
- **Remove the findings and keep the cap configurable.** Rejected: that asks
  every project to hold an opinion about a noise control none of them varied.
  Every configuration in this repository used the default of eight; the one
  exception lowered it to two so that three fixture classes could demonstrate
  it, which is a fixture's convenience rather than a repository's requirement.
- **Remove the findings, the analyzer, module identity, and the four limits,
  and keep the cap as a constant.** Chosen.

## Consequences

- **Four limits and two configuration fields are gone.** The transitive and
  direct spread thresholds, the minimum caller count, and the caller majority
  ratio; `allowSpreadFor` and `workspaceStructure`. The limits schema is now
  **strict**: a retired limit is refused rather than stripped, so a
  configuration cannot go on carrying a number that nothing reads while looking
  as though it were in force.
- **The cap now costs nine fixture classes to demonstrate.**
  `projects/ic-suite/callidescope/callidescope-examples/examples/implementation-fan-out` grew from
  three sinks to nine, because eight is no longer configurable. Its guide used to
  say that demonstrating the cap at the default "would otherwise need nine";
  that is now what it does.
- **Committed reports lose two sections and two columns.** Every project's
  `## 🔭 Callidescope` block drops `### Module spread` and
  `### Possibly misplaced`, and the workspace project index drops its `Spread`
  and `Misplaced` columns. Reports are regenerated from `main` rather than on a
  branch, so a block still naming those sections is stale rather than wrong.
- **`typeDepths` went with the analyzer.** The per-class depth range was
  produced by the same service, keyed by module identity, and rendered nowhere
  — it reached the JSON report and no table. Keeping it would have meant
  keeping module identity for a number nothing displayed.
- **The cap is no longer visible in any configuration.** A reader wondering why
  a structural expansion was dropped has to find
  `MAXIMUM_IMPLEMENTATION_CANDIDATES` in `@callidescope/graph`, where the
  constant's own comment says what it is and why it is not a field. That is the
  trade: one fewer field every project must hold an opinion about, one more
  behavior that is not discoverable from a configuration file.
