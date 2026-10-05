import {
  type CallidescopeConfiguration,
  type CallidescopeLimits,
  type CallidescopeProjectConfiguration,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_PROJECT_README_HEADING,
} from "@callidescope/configuration";

/**
 * The starting point every project in this repository writes down and then
 * overrides.
 *
 * **Defaults, never ceilings, and never inheritance.** Nothing resolves a
 * number out of this object at run time any more: a project's own file is the
 * complete statement of how that project is traced and judged, and these
 * numbers reach it by being spread into it, where a reader can see them. A
 * project declaring a number *higher* than one of these keeps its own —
 * nothing clamps it. That has to be true for the numbers below to mean
 * anything: a workspace limit is pinned by the single worst stack anywhere in
 * the repository, so reading it as a ceiling would hold every project to the
 * worst one's allowance, which is the arrangement the per-project gate exists
 * to replace.
 *
 * A project's own `callidescope.config.ts` spreads `projectDefaults` — the
 * second export below — and declares `limits` explicitly beside it, both
 * fields named and both real numbers now that every traced project gates
 * breadth as well as depth: `{ maximumBreadth: 8, maximumDepth: 6 }` is the
 * shape every one of them takes. The spread and the explicit `limits` object
 * are not doing the same job: the spread carries `entryPoints`, `exclude`,
 * `write`, and whatever `limits` a project does not restate forward
 * unchanged, and `limits` is what a project overrides. Leaving a field out of
 * either is a refusal naming the project and the field — see
 * `docs/adr/0007-complete-project-configurations.md`.
 *
 * A project's file also carries no type annotation, and so no import of
 * `CallidescopeConfiguration`. An `import type` is still an Nx dependency
 * edge: it puts `@callidescope/configuration` into that project's graph, it
 * widens what the project's own `callidescope-gate` target has to trace, and it
 * asks the manifest of a project like `logger` to declare a toolchain package
 * that project does not use. What it would buy is a second check of something
 * already checked: the four fields a project may set are validated when the
 * file is read and a fifth is refused by name, and every project's
 * `tsconfig.json` names its own file, so the object literal is compiled either
 * way. `packages/ic-suite/callidescope/callidescope-examples` is the annotated exception on purpose:
 * its two configuration files are the worked examples of this shape, and it
 * depends on the configuration package for real.
 *
 * ## The projects that used to override nothing
 *
 * Every traced project holds a complete file now — see
 * `docs/adr/0007-complete-project-configurations.md`. There used to be a
 * class of project that took the number below without a file of its own, and
 * consolidating the conformetry Languages removed the last of it: six leaf
 * analyzers — `conformetry-typescript`, `-json`, `-jupyter`, `-markdown`,
 * `-python`, `-text` — each held real code that rooted nothing, because every
 * one of them was entered from above rather than directly, so each measured
 * zero however much it did. They are now modules of `conformetry-languages`,
 * and what was a call between packages is a call inside one, so a scoped run
 * finally enters at a surface of its own and measures four rather than zero.
 * That package spreads `projectDefaults`, declares `limits.maximumDepth: 4`
 * beside it, and gates like any other — breadth included, since a callable's
 * own fan-out counts whether or not anything ever calls it.
 *
 * The dependency closure a scoped run traces did fix this for
 * `codometer-changes`, which measured zero before it and ten after. The ten
 * with no caller are a different phenomenon and the closure does not reach
 * them: it supplies the callees a stack descends into, and what these are
 * missing is a caller.
 *
 * ## The projects traced by nothing
 *
 * Seven projects are not measured at all, rather than taking the number
 * below — so they hold no configuration file either, being no project's file
 * to write. The four skill packages — `callidescope-agents`,
 * `codependix-agents`, `codometer-agents`, `conformetry-agents` — hold barely
 * a callable between them, the same landmine a real project would avoid by
 * declaring its own number rather than being gated at zero, except these have
 * no real code underneath to ever grow into. And
 * `codependix-examples`, `codometer-examples`, and `conformetry-examples` are
 * fixture corpora rather than libraries: a depth number over one reports on a
 * corpus's incidental shape instead of on production code, the same reason
 * `packages/ic-suite/callidescope/callidescope-examples` is excluded below in favor of its own
 * report-freshness gate.
 *
 * A project cannot exclude itself this way — discovery finds a project's
 * `tsconfig.json` before that project's own `callidescope.config.ts` is ever
 * read, so removing a project from tracing has to happen at the workspace's
 * own file. `configuration/.callidescopeignore` is where all seven are named,
 * beside `packages/ic-suite/callidescope/callidescope-examples` and the other exclusions this
 * workspace declares.
 *
 * Six projects under `applications/` and `tools/` declare their own measured
 * depth the same way — but two more things sit outside what either task covers
 * and still need writing down rather than left implicit.
 *
 * `configuration/` measures depth 3 and breadth 2 and holds its own
 * `tsconfig.json`, so it appears as a traced root — but it is not an Nx
 * project, so no target can ever be inferred onto it, and it is gated by
 * nothing. It is also the one traced project that writes no configuration of
 * its own, this file being the file at its root: a run cannot read one file as
 * both its own workspace configuration and a project's, and no second file may
 * sit beside it under a name discovery would find. So it is judged by
 * `workspaceLimits` directly — the one export below that carries a real
 * `maximumBreadth` of its own, since it is the number this project itself is
 * measured against — and it keeps being traced and published by the
 * workspace `write` run.
 *
 * `applications/JimmyPaolini` and `applications/affirmancy` have no
 * `callidescope-gate` target at all — a different fact from taking the default. Taking the default
 * means a gate that runs and passes against the number below; these two have no
 * gate to pass. `JimmyPaolini` holds only a `package.json`, being the git
 * submodule this repository leaves deliberately uninitialized everywhere (see
 * `AGENTS.md`'s `### Git Worktrees`); `affirmancy` is a Python Jupyter
 * notebook application holding no `tsconfig.json`, and the plugin infers its
 * targets only onto a project that holds one
 * (`packages/ic-suite/callidescope/callidescope-nx/src/modules/plugin/plugin.service.ts:353`).
 *
 * Imported by the six conformetry leaf analyzers above, which name
 * `maximumDepth: workspaceLimits.maximumDepth` explicitly rather than
 * spreading it, so a number lowered here still reaches them; every other
 * project's own boundary-tested number would otherwise be mistaken for one
 * still tracking this file.
 */
export const workspaceLimits = {
  /**
   * `configuration/` project's own breadth, and the number the six
   * conformetry leaf analyzers took before this ticket measured their own.
   *
   * Two, from `bodyCoAuthoredOnly` and `footerCoAuthoredOnly` in
   * `configuration/commitlint.config.ts`, tied at the widest — each filters
   * trailers and checks every one of them, ordinary fan-out rather than a
   * closed enumeration. `configuration/` is judged by this number directly,
   * since it is the one traced project with no `callidescope.config.ts` of
   * its own to write a boundary-tested number into.
   */
  maximumBreadth: 2,
  /**
   * The depth `projectDefaults` carries into a project that overrides nothing
   * of its own — and no longer this repository's ratchet.
   *
   * **The ratchet is thirty-eight numbers now**, one per project that declares
   * its own, every one of them set from a boundary-tested run at its gate's own
   * scope: it passes at the number written and fails one below it. That is what
   * a ratchet is, and it is what this single number could never be. Seventeen
   * is the deepest stack anywhere in the repository, so as one workspace-wide
   * limit it gated the three projects near it and nothing else — `logger` at
   * four had thirteen frames of free rein, which is to say no gate at all.
   * `nx run callidescope-cli:start -- limits --config
   * configuration/callidescope.config.ts` prints the whole set and the file
   * each number is written in.
   *
   * **Lowering this number is not how the ratchet descends.** Every traced
   * project now writes its own complete file, with its own boundary-tested
   * number beside the spread — the thirty-eight this section counts — so no
   * traced project reads this value as the number it is judged by any more.
   * The seven projects with no stack to gate are the ones `## The projects
   * traced by nothing` above names, and they hold no configuration file to
   * read a lowered number from either. What a number here still sets is the
   * starting point `projectDefaults` hands a project that has not yet
   * measured and declared its own — a new project, not an existing one, since
   * every existing traced project's own file is what a gate reads. To tighten
   * a project already declaring its own, write the boundary-tested number in
   * that project's own `callidescope.config.ts` instead.
   *
   * The history is still worth keeping, because it is what the per-project
   * numbers were measured against. Set to the issue's suggested six, one
   * workspace limit failed on arrival with dozens of findings — a backlog
   * rather than a gate, and a red pipeline nobody can act on teaches people to
   * ignore it. It came down from 19 by removing three frames that were not
   * layers: a `FormsService` method that forwarded its arguments unchanged to
   * the forms builder, a rung of lexico-ingestion's finite-verb cascade whose
   * whole body re-ran three guards the rungs above had already applied, and a
   * caelundas method that destructured six fields and passed the same six on.
   * Nothing was merged that was doing work.
   *
   * Three stacks sit at 17 and are why it stopped there:
   * `LexicoIngestionCommand.run`, and callidescope-nx's `depthExecutor` and
   * `breadthExecutor`. Both of those projects now write that number in a file
   * of their own, where it gates the project owning the stack and nobody
   * else — which is the whole difference this ticket made. Sixteen
   * is one frame from each and neither frame is obviously spare — lexico's
   * seventeen are a command, a recursion pair, a parse, and the
   * mood/voice/tense/number/person descent, each of which earns its frame.
   * Reaching 16 by collapsing one of those would buy the number and cost the
   * code, which is the trade this comment exists to refuse.
   */
  maximumDepth: 17,
} satisfies CallidescopeLimits;

/**
 * What a project's own `callidescope.config.ts` spreads, and then overrides.
 *
 * The second of this file's two exports, and the second of its two roles. The
 * default export below is the *workspace run's* own configuration — the
 * directories it traces, the ignore file it reads, and the destinations it
 * writes — and is what a run loads. This object is what one *project* is held
 * to, and nothing here belongs to the run: a project spreading it cannot
 * accidentally adopt the workspace's own output destinations, because none of
 * them is in here to adopt.
 *
 * ```ts
 * import { projectDefaults } from "../../configuration/callidescope.config.js";
 *
 * export default {
 *   ...projectDefaults,
 *   limits: { maximumBreadth: undefined, maximumDepth: 4 },
 * };
 * ```
 *
 * A relative import resolved by the configuration loader when it reads the
 * file, rather than a package dependency, so spreading this adds no edge to a
 * project's dependency graph — the same arrangement forty-nine
 * `codometer.config.ts` files in this repository already run on.
 *
 * **Spreading this is what makes a complete file cheap.** A project's
 * configuration must set every field — that is what lets it be read as the
 * whole statement of how the project is traced and judged — and writing eleven
 * members out by hand in forty-two files would be a tax nobody pays twice.
 * The spread costs one line, and what a reader then sees in the project's own
 * file is the complete set: the tool's own decorator list, its entry-point
 * switches, the default depth, and a markdown destination pointing at that
 * project's own README.
 *
 * Every traced project spreads it, each writing its own `limits` beside the
 * spread the way the example above shows.
 * `packages/ic-suite/callidescope/callidescope-examples/callidescope.config.ts` is outside that count
 * altogether: the package is excluded from workspace tracing by
 * `.callidescopeignore`, and its own file is the annotated worked example this
 * file names above, standing alone with a full type import and its fields
 * spelled out inline precisely so a reader can see every field a project must
 * set without also having to resolve this file's export.
 */
export const projectDefaults = {
  entryPoints: {
    addresses: [],
    decorators: [...DEFAULT_ENTRY_POINT_DECORATORS],
    includeExportedFunctions: true,
    includeOrphans: true,
    includeTests: false,
  },
  exclude: [],
  limits: {
    /**
     * Left unset here, and never actually taken by anything: every traced
     * project's own `limits` now names a real, boundary-tested
     * `maximumBreadth`, `workspaceLimits` included for `configuration/` and
     * the six conformetry leaf analyzers. The field stays `undefined` rather
     * than a number, because this object carries no gate scope of its own to
     * measure one against — a value written here would be a guess rather
     * than a measurement, and every project that spreads this object
     * overrides `limits` wholesale rather than merging into it.
     */
    maximumBreadth: undefined,
    maximumDepth: workspaceLimits.maximumDepth,
  },
  write: {
    /**
     * The section a project publishes into its own README.
     *
     * The path is read relative to the project's own root, so this reaches
     * `<project>/README.md` — and a project moving its section somewhere else,
     * or writing `undefined` to publish nothing at all, is a one-line edit in
     * the file that owns the document. There is no workspace declaration left
     * that could reach the same file from the other direction.
     */
    markdown: {
      heading: DEFAULT_PROJECT_README_HEADING,
      path: "README.md",
    },
    /**
     * No diagram by default.
     *
     * A project's README carries the table today and nothing else, and turning
     * a diagram on for every project at once is a decision about thirty-eight
     * documents rather than a default. A project that wants one writes it here.
     */
    mermaid: undefined,
  },
} satisfies CallidescopeProjectConfiguration;

/**
 * The report is published on main, and only the depth gate runs on a branch.
 *
 * A generated block in a tracked file has to be regenerated by whoever changes
 * the thing it describes, and this one changes on nearly every pull request.
 * Codometer already documents where that leads — every branch rewrites the same
 * block and conflicts with every other one — which is why it measures on main
 * instead. A call-stack block inherits that, and something worse: staleness
 * would fail every pull request whose call graph moved until the author reran
 * the writer, burying the depth findings the gate exists to surface.
 *
 * So the two are split at the mechanism rather than by leaving the destination
 * unset. Depth — and, wherever a project declares `limits.maximumBreadth`,
 * breadth too — is gated by the inferred per-project `callidescope-gate`
 * target, an executor of its own rather than a flag on this one, scoped by
 * `nx affected` to whatever a change touched. It reads no destination at all,
 * so its exit code is purely the depth (and, where judged, breadth) verdict.
 * `nx run codebase:callidescope:write` passes `--write`, and the release
 * workflow runs it on main. That is the only configuration this target
 * carries now: `lint-code` does not depend on it, so no run of it ever
 * forwards `write` here, and `defaultConfiguration` is `write` for the same
 * reason — there is nothing else left to default to.
 *
 * Every rule and finding this configuration turns on has a worked example in
 * `packages/ic-suite/callidescope/callidescope-examples`, which also demonstrates the opposite half
 * of the split above: it gates `reports` rather than `depth`, because its
 * traced source is frozen fixture code. `.callidescopeignore` keeps it out of
 * this run, because its fixtures exist to breach the limits set here.
 *
 * - `packages/ic-suite/callidescope/callidescope-examples/README.md` — how to read a stack, and how
 *   to act on a depth or breadth finding.
 * - `packages/ic-suite/callidescope/callidescope-examples/AGENTS.md` — a "callidescope reported X →
 *   open this example" table, for an agent handed a failing run.
 */
const callidescopeConfiguration: CallidescopeConfiguration = {
  /**
   * `LoggerService` sits behind nearly every other callable in this
   * repository. A call to it is a fact about instrumentation, not about
   * how deep or wide the code around it is, and counting it would move
   * every other callable's depth and breadth on a change that has nothing
   * to do with them.
   */
  excludeCallees: ["LoggerService.*"],
  excludeFrom: ["configuration/.callidescopeignore"],
  limits: workspaceLimits,
  write: {
    /**
     * The workspace-scope block in the repository's own README.
     *
     * The root README used to carry a fanned-out project section like any
     * other project's, because the root holds a `tsconfig.json` and so was
     * discovered as a project. What it described was the four loose
     * maintenance scripts that belonged to no other project — never the
     * workspace — and it was headed "Call stacks traced through ``", the
     * project's name being its root-relative path and the root's being empty.
     * `.callidescopeignore` now drops that project, and this destination puts
     * the whole run's report there instead: the summary, one row per project
     * against its own limit, and the findings nothing gates.
     *
     * `heading` is set because the block is spliced into a file that already
     * has a title. The default is `#`, and a second first-level heading is
     * something every markdown linter here rejects; the subsections follow
     * this level down to `###` on their own.
     *
     * Published by `nx run codebase:callidescope:write` on main, and for the
     * same reason as the per-project sections below it, never checked on a
     * pull request.
     */
    markdown: {
      description:
        "The workspace's call graph, traced by [callidescope](packages/ic-suite/callidescope/callidescope-cli), regenerated by `nx run codebase:callidescope:write`. Projects are listed tightest-first: the rows at the top are the ones a ratchet cannot descend past.",
      heading: "## 🔭 Callidescope",
      path: "README.md",
    },
  },
};

export default callidescopeConfiguration;
