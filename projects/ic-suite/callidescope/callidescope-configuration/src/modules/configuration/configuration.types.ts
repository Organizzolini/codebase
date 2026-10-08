// 🏷️ Types

import type { CallGraphResult } from "@callidescope/core";

/** The shape of a `callidescope.config.ts` default export. */
export interface CallidescopeConfiguration {
  /**
   * Project directories to trace. Every directory holding its own
   * `tsconfig.json`, found by walking the workspace, when omitted.
   *
   * Narrowing this is the difference between a one-second pre-commit check and
   * a whole-workspace analysis, because each directory needs its own program.
   */
  directories?: string[] | undefined;
  entryPoints?: CallidescopeEntryPoints | undefined;
  exclude?: string[] | undefined;
  /**
   * Globs matched against a callable's display name (`Type.member`):
   * calls landing on a match are dropped from the graph entirely, counting
   * toward neither the caller's depth nor its breadth.
   *
   * For a cross-cutting callable like a logger, every call site is a fact
   * about instrumentation, not about how deep or wide the code around it
   * is — counting it would move every other callable's numbers on a change
   * that has nothing to do with them.
   */
  excludeCallees?: string[] | undefined;
  /** Gitignore-syntax files listing paths to leave untraced. */
  excludeFrom?: string[] | undefined;
  limits?: CallidescopeLimits | undefined;
  write?: CallidescopeWriteConfiguration | undefined;
}

/** Which callables are treated as the roots of a call stack. */
export interface CallidescopeEntryPoints {
  /**
   * Callables this configuration declares as roots, written as
   * `<file>#<qualified-name>` — the same address the `depth` and `breadth`
   * commands accept and every stack frame prints, so one can be copied out of
   * a report straight into here. A trailing `:<line>` disambiguates a file
   * holding two declarations under one qualified name.
   *
   * Declared roots are additive: the rules below keep running, and orphan
   * promotion still catches whatever nobody named. An address naming a
   * callable a rule already rooted is one root, not two.
   */
  addresses?: string[] | undefined;
  /**
   * Decorators whose methods a framework invokes.
   *
   * Matched against the decorator's own name, then confirmed against the
   * package that declares it, so a locally defined `Command` is not mistaken
   * for nest-commander's.
   */
  decorators?: string[] | undefined;
  /** Treat every `src/index.ts` export as a root. Defaults to true. */
  includeExportedFunctions?: boolean | undefined;
  /**
   * Promote callables nothing in the repository calls. Defaults to true.
   *
   * This is the safety net that makes a wrong rule set visible: without it, a
   * missing rule silently removes whole subtrees from every measurement.
   */
  includeOrphans?: boolean | undefined;
  /** Trace test files too. Defaults to false. */
  includeTests?: boolean | undefined;
}

/** JSON output destination. */
export interface CallidescopeJsonOutputConfiguration {
  indentation?: number | undefined;
  path: string;
}

/**
 * The limits one command line overrode, and only those.
 *
 * Held apart from the resolved configuration because the two answer different
 * questions. The configuration says what every limit is; this says which of
 * them a flag chose, which is what lets the override reach the number each
 * project is really gated by rather than stopping at the workspace file.
 *
 * A member is present only when a flag supplied it, so an override reaches a
 * project's own declared limit without ever supplying one to a project that
 * declared none.
 */
export interface CallidescopeLimitOverrides {
  maximumBreadth?: number | undefined;
  maximumDepth?: number | undefined;
}

/**
 * Thresholds that decide what a run reports.
 *
 * Two, and both per project: how deep a stack may run, and how widely one
 * callable may reach. Every limit this tool once had beyond these described a
 * finding nobody acted on.
 */
export interface CallidescopeLimits {
  /**
   * Distinct callables a callable may call directly before it is reported.
   *
   * No default is applied: a project must configure this explicitly before
   * `--check breadth` can run against it.
   */
  maximumBreadth?: number | undefined;
  /** Frames a call stack may hold before it is reported. */
  maximumDepth?: number | undefined;
}

/** Markdown output destination. */
export interface CallidescopeMarkdownOutputConfiguration {
  description?: string | undefined;
  endMarker?: string | undefined;
  /**
   * Heading the block is written under, `# 🔭 Callidescope` by default.
   *
   * Configurable because a block is spliced into somebody's document, and it is
   * the level rather than the words that usually needs changing: a block
   * spliced into a file that already has a title needs an `##` here, or the
   * file ends up with two first-level headings and every markdown linter
   * rejects it. The subsection levels follow whatever this is set to, so the
   * block stays a well-formed subtree of the document it lands in.
   */
  heading?: string | undefined;
  path: string;
  /**
   * Stacks shown before the rest fold into a disclosure.
   *
   * A member of the destination rather than of the run, because it is a fact
   * about the document the block lands in: a project's README wants three and
   * a report file wants all of them, and one number for both could only ever
   * be wrong for one of them.
   */
  previewCount?: number | undefined;
  render?: RenderMarkdownOutput | undefined;
  startMarker?: string | undefined;
  writeBlock?: undefined | WriteMarkdownOutput;
}

/** How a run renders what it found. */
export type CallidescopeOutputFormat = "json" | "markdown" | "mermaid";

/**
 * The complete shape of a project's own `callidescope.config.ts`.
 *
 * Every member is required. A project file is meant to be readable as the
 * whole statement of how that project is traced and judged, which a shape with
 * optional members cannot be: an absent field and a field set to the value it
 * would have defaulted to look identical in the diff, and only one of them was
 * a decision. A project spreads the workspace's `projectDefaults` and overrides
 * what it means to, so completeness costs one line rather than twenty — the
 * same arrangement this repository's codometer configuration files already run.
 *
 * A member is required, not non-empty: `undefined` is the value that says *no
 * destination*, so a project with nothing worth publishing writes that rather
 * than leaving the member out.
 *
 * This is enforced rather than advisory. Every traced project's file is checked
 * against it as it is loaded, and a project leaving a field out is refused by
 * name — as is a traced project with no file at all.
 */
export interface CallidescopeProjectConfiguration {
  entryPoints: CallidescopeProjectEntryPoints;
  /** Globs matched against paths relative to this project's own root. */
  exclude: string[];
  limits: CallidescopeProjectLimits;
  write: CallidescopeProjectWriteConfiguration;
}

/** Which of a project's callables are treated as the roots of a call stack. */
export interface CallidescopeProjectEntryPoints {
  addresses: string[];
  decorators: string[];
  includeExportedFunctions: boolean;
  includeOrphans: boolean;
  includeTests: boolean;
}

/**
 * The two limits a project is gated by.
 *
 * `maximumBreadth` is required and may be `undefined`, which is a project
 * saying outright that it gates depth and not breadth — the one thing the
 * absent field could never distinguish itself from a project that forgot.
 */
export interface CallidescopeProjectLimits {
  maximumBreadth: number | undefined;
  maximumDepth: number;
}

/**
 * Where a project's own published section and diagram land.
 *
 * Both paths are read relative to the project's own root, so a project cannot
 * write into a sibling by declaring one. The run's JSON report is absent by
 * construction: it is the run's single output, not a project's to redirect.
 *
 * A destination is the shared markdown-block shape rather than a complete one
 * of its own. What a project is *judged* by has to be written out; where the
 * markers and the heading of its own block sit is presentation the tool has a
 * working answer for, and requiring all seven members would make overriding a
 * path cost six restatements of a default.
 */
export interface CallidescopeProjectWriteConfiguration {
  markdown: CallidescopeMarkdownOutputConfiguration | undefined;
  mermaid: CallidescopeMarkdownOutputConfiguration | undefined;
}

/** Where a run writes its findings. */
export interface CallidescopeWriteConfiguration {
  json?: CallidescopeJsonOutputConfiguration | undefined;
  markdown?: CallidescopeMarkdownOutputConfiguration | undefined;
  /**
   * A markdown block whose call stacks are drawn rather than printed.
   *
   * Its own destination rather than a mode on `markdown`, so a repository can
   * publish both: the tree carries what each frame takes, returns, and
   * documents, and the diagram carries the shape they make together. Neither
   * one is the other with a flag flipped.
   */
  mermaid?: CallidescopeMarkdownOutputConfiguration | undefined;
}

/** Arguments accepted by the configuration loader. */
export interface LoadConfigurationArguments {
  configurationPath?: string | undefined;
  searchDirectory?: string | undefined;
}

/**
 * A resolved configuration, what the file itself declared, and which file it
 * was.
 *
 * Both objects are kept because they answer different questions. A refusal has
 * to name the fields the file set, which resolution would otherwise
 * manufacture; anything judging a project reads values only resolution
 * supplies. The path is what nothing downstream of the search can still tell,
 * and what keeps one file from being given two roles in a run.
 */
export interface LoadedCallidescopeConfiguration {
  /** The file's own object, before a single default was applied. */
  authored: CallidescopeConfiguration;
  configuration: ResolvedCallidescopeConfiguration;
  /** `undefined` when no configuration file was found at all. */
  path: string | undefined;
}

/**
 * What a load reports when the caller named the file, so a path is certain.
 *
 * The search may find nothing and legally say so; a named path either resolves
 * or refuses, and never comes back as `undefined`.
 */
export interface LoadedCallidescopeConfigurationFile extends LoadedCallidescopeConfiguration {
  path: string;
}

/** One project's own configuration file, and the project it configures. */
export interface LoadedProjectConfiguration {
  /** The file's own object, before a single default was applied. */
  authored: CallidescopeConfiguration;
  configuration: ResolvedCallidescopeConfiguration;
  path: string;
  /** Workspace-relative root of the project the file sits at. */
  project: string;
}

/** Arguments accepted by the project configuration loader. */
export interface LoadProjectConfigurationsArguments {
  /** Workspace-relative project roots to look beside. */
  projects: readonly string[];
  /**
   * The file already loaded as the run's own workspace configuration, either
   * absolute or relative to `workspaceRoot` — resolved against that root, the
   * same way every project path here is, so the two are comparable by
   * construction rather than by convention.
   *
   * One file, one role per run: a configuration that a run was pointed at is
   * not additionally read as the configuration of whichever project happens to
   * hold it. A package whose Nx target names its own file is exactly that case,
   * and treating the file as both would refuse it for the workspace-only fields
   * it legitimately sets.
   */
  workspaceConfigurationPath?: string | undefined;
  workspaceRoot: string;
}

/** Splicing helpers handed to a configured `writeBlock` function. */
export interface MarkdownAnchorHelpers {
  endMarker: string;
  startMarker: string;
  /**
   * Splices the anchored block into a file, appending it when the markers are
   * absent, and creating the file when it does not exist.
   *
   * In check mode nothing is written and the return value reports whether the
   * file already holds the current block. Defaults to the rendered content and
   * the configured path; pass either to override.
   */
  syncAnchoredBlock: (overrides?: {
    content?: string | undefined;
    path?: string | undefined;
  }) => boolean;
  /** The content wrapped in the configured markers, ready to place anywhere. */
  wrapInAnchors: (content?: string) => string;
}

/** Whether a project's own configuration may set one field, or one member. */
export type ProjectFieldPermission = "forbidden" | "permitted";

/**
 * The two limits one project is gated by, and the file both were written in.
 *
 * Only depth and breadth: every other limit shapes how the call graph itself is
 * built, which has to stay one answer for the whole workspace.
 *
 * One `path` for the pair rather than one apiece, because there is only one
 * file left for either to have come from. Every traced project's configuration
 * is complete, so both numbers are written in that project's own file or the
 * file is refused — there is no longer a state in which a project took one
 * limit from itself and the other from somewhere else.
 */
export interface ProjectLimits {
  /** Absent when the project declared no breadth limit, which most do not. */
  maximumBreadth: number | undefined;
  maximumDepth: number;
  /**
   * The file both numbers were written in.
   *
   * Absent only on a workspace row a file never wrote: `maximumDepth` is
   * defaulted during resolution, so a path stamped unconditionally would name
   * a file for a number that file never mentions.
   */
  path: string | undefined;
}

/**
 * The limits every traced project is judged against.
 *
 * `byProject` holds an entry for every project a run reached, so a caller
 * listing the workspace's limits reads this and nothing else. `workspace` is
 * what the workspace file itself declares — the numbers `projectDefaults`
 * carries into each project's file, and the ones the directory holding that
 * very file is judged by, it being the one project that cannot write a
 * configuration of its own.
 */
export interface ProjectLimitsLookup {
  /** Keyed by workspace-relative project root. */
  byProject: ReadonlyMap<string, ProjectLimits>;
  workspace: ProjectLimits;
}

/** What a `render` function is handed. */
export interface RenderMarkdownArguments {
  /** The configured description, for a renderer that wants to place it itself. */
  description: string | undefined;
  /**
   * The built-in table rendering of these same findings.
   *
   * Call it to add to the default report rather than replace it.
   */
  renderTables: () => string;
  result: CallGraphResult;
}

/** Turns the traced findings into the markdown that will be written. */
export type RenderMarkdownOutput = (args: RenderMarkdownArguments) => string;

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has to
 * know which fields a configuration file may omit.
 */
export interface ResolvedCallidescopeConfiguration {
  directories: string[];
  entryPoints: ResolvedCallidescopeEntryPoints;
  exclude: string[];
  excludeCallees: string[];
  excludeFrom: string[];
  limits: ResolvedCallidescopeLimits;
  write: ResolvedCallidescopeWriteConfiguration;
}

/** Entry-point rules with defaults applied. */
export interface ResolvedCallidescopeEntryPoints {
  addresses: string[];
  decorators: string[];
  includeExportedFunctions: boolean;
  includeOrphans: boolean;
  includeTests: boolean;
}

/** JSON output destination with defaults applied. */
export interface ResolvedCallidescopeJsonOutputConfiguration {
  indentation: number;
  path: string;
}

/** Thresholds with defaults applied. */
export interface ResolvedCallidescopeLimits {
  /**
   * Distinct callables a callable may call directly before it is reported.
   *
   * Stays optional even after resolution: unlike every other limit, this one
   * has no default, so its absence is a fact a `--check breadth` run must act
   * on rather than something resolution can paper over.
   */
  maximumBreadth?: number | undefined;
  maximumDepth: number;
}

/**
 * Markdown output destination with defaults applied.
 *
 * `render` and `writeBlock` stay `undefined` when the configuration supplies
 * neither: the built-in implementations live in the CLI that calls them, so
 * "unset" is what selects them rather than a default named here.
 */
export interface ResolvedCallidescopeMarkdownOutputConfiguration {
  description: string | undefined;
  endMarker: string;
  heading: string;
  path: string;
  previewCount: number;
  render: RenderMarkdownOutput | undefined;
  startMarker: string;
  writeBlock: undefined | WriteMarkdownOutput;
}

/**
 * Output destinations with defaults applied.
 *
 * Both stay `undefined` when unconfigured, which is the normal case: a run that
 * names no destination reports to the console and exits on violations, so
 * nothing it writes can go stale.
 */
export interface ResolvedCallidescopeWriteConfiguration {
  json: ResolvedCallidescopeJsonOutputConfiguration | undefined;
  markdown: ResolvedCallidescopeMarkdownOutputConfiguration | undefined;
  mermaid: ResolvedCallidescopeMarkdownOutputConfiguration | undefined;
}

/** Arguments accepted by the per-project limit resolver. */
export interface ResolveProjectLimitsArguments {
  /**
   * The limits this run's command line overrode, if any.
   *
   * Applied to every project that declared the limit being overridden, because
   * a project's own number is the one its gate reads — an override that stopped
   * at the workspace file would be a flag that changed nothing any gate looks
   * at. A project that declared no breadth limit is left without one: the flag
   * overrides, and never supplies.
   */
  limitOverrides?: CallidescopeLimitOverrides | undefined;
  /** The configuration files projects declared for themselves. */
  projectConfigurations: readonly LoadedProjectConfiguration[];
  /** Workspace-relative root of every project the run reached. */
  projects: readonly string[];
  /**
   * The limits the workspace file itself wrote down, exactly as authored.
   *
   * Presence is what decides whether the workspace row names a file: the
   * resolved configuration below manufactures `maximumDepth` for every run, so
   * a path stamped from it alone would name a file for a number that file
   * never wrote.
   */
  workspaceAuthoredLimits: CallidescopeLimits | undefined;
  /** The run's own configuration, which the workspace row reads its numbers from. */
  workspaceConfiguration: ResolvedCallidescopeConfiguration;
  /** The file that configuration was read from, when one was found. */
  workspaceConfigurationPath: string | undefined;
}

/** What a `writeBlock` function is handed. */
export interface WriteMarkdownArguments {
  /** True when nothing may be written and staleness is the only question. */
  check: boolean;
  /** The rendered markdown, before any anchoring. */
  content: string;
  helpers: MarkdownAnchorHelpers;
  path: string | undefined;
  result: CallGraphResult;
}

/**
 * Decides which file the rendered markdown lands in, and how.
 *
 * Return `false` to report the destination as stale — in check mode that is
 * what fails the command. Anything else counts as up to date.
 */
export type WriteMarkdownOutput = (args: WriteMarkdownArguments) => boolean;
