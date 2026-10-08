// ♟️ Constants

import { z } from "zod";

import type {
  CallidescopeConfiguration,
  CallidescopeProjectConfiguration,
  CallidescopeProjectEntryPoints,
  CallidescopeProjectLimits,
  CallidescopeProjectWriteConfiguration,
  CallidescopeWriteConfiguration,
  ProjectFieldPermission,
  RenderMarkdownOutput,
  WriteMarkdownOutput,
} from "./configuration.types";

/**
 * Configuration file names, in the order they are searched for.
 *
 * TypeScript comes first because that is the form a repository gets type
 * checking from, and the form every other configuration file in this workspace
 * is written in.
 */
export const CONFIGURATION_FILE_NAMES = [
  "callidescope.config.ts",
  "callidescope.config.mts",
  "callidescope.config.cts",
  "callidescope.config.js",
  "callidescope.config.mjs",
  "callidescope.config.cjs",
  "callidescope.config.json",
  "callidescope.config.jsonc",
] as const;

/** Extensions the configuration loader knows how to read. */
export const SUPPORTED_CONFIGURATION_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".jsonc",
  ".mjs",
  ".mts",
  ".ts",
]);

/**
 * Files that mark a repository root.
 *
 * `package.json` is deliberately absent: every package in a workspace has one,
 * so it would stop the upward walk at the first project rather than the root.
 */
export const REPOSITORY_ROOT_MARKERS = [".git", "pnpm-workspace.yaml"] as const;

/** Directories no repository wants traced, kept out even when unmentioned. */
export const DEFAULT_EXCLUDE_GLOBS = [
  "**/.conformetry/**",
  "**/.nx/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
  "**/output/**",
] as const;

/**
 * Frames allowed on a call stack before it is reported.
 *
 * Six is the issue's own example limit. It counts frames inclusive of the entry
 * point, so a resolver calling a service calling a repository is three.
 */
export const DEFAULT_MAXIMUM_DEPTH = 6;

/** Decorators whose methods a framework invokes, making them stack roots. */
export const DEFAULT_ENTRY_POINT_DECORATORS = [
  "Command",
  "Cron",
  "Delete",
  "Get",
  "Mutation",
  "OnEvent",
  "Option",
  "Patch",
  "Post",
  "Put",
  "Query",
  "ResolveField",
  "SubscribeMessage",
] as const;

/** Spaces used to indent the JSON report. */
export const DEFAULT_JSON_INDENTATION = 2;

/** Every format a run may print, in the order a prompt offers them. */
export const CALLIDESCOPE_OUTPUT_FORMATS = [
  "markdown",
  "mermaid",
  "json",
] as const;

/** What a run prints to standard output when nothing says otherwise. */
export const DEFAULT_OUTPUT_FORMAT = "markdown";

/** Heading the section embedded in a project README is written under. */
export const DEFAULT_PROJECT_README_HEADING = "## 🔭 Callidescope";

/**
 * Heading a whole-run markdown block is written under.
 *
 * First level, because the historical destination for this block is a file of
 * its own that the block is the whole of. A block spliced into a file that
 * already has a title sets `heading` to a deeper level instead.
 */
export const DEFAULT_RUN_HEADING = "# 🔭 Callidescope";

/** Stacks a README section shows before the rest fold into a disclosure. */
export const DEFAULT_PREVIEW_COUNT = 3;

/** Opening anchor of the generated markdown block. */
export const DEFAULT_MARKDOWN_START_MARKER = "<!-- callidescope:start -->";

/** Closing anchor of the generated markdown block. */
export const DEFAULT_MARKDOWN_END_MARKER = "<!-- callidescope:end -->";

// 🔒 Project Configuration

/**
 * Writes a list of names as an English sentence fragment.
 *
 * `Intl.ListFormat` rather than a hand-rolled join, because the empty and
 * single-name cases a hand-rolled one has to guard are unreachable here — the
 * list comes from a record with three permitted fields in it — so the guards
 * would be branches no test could ever take.
 */
const FIELD_LIST_FORMAT = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

/**
 * Reads the names one classified field contributes to the permitted set.
 *
 * A field classified whole contributes itself or nothing; a field classified a
 * member at a time contributes each permitted member as a dotted name, which
 * is what a reader has to type to fix the file and so what a refusal prints.
 */
const readPermittedNames = (args: {
  field: string;
  permission: ProjectFieldPermission | Record<string, ProjectFieldPermission>;
}): string[] => {
  if (typeof args.permission === "string") {
    return args.permission === "permitted" ? [args.field] : [];
  }

  return Object.entries(args.permission)
    .filter(([, member]) => member === "permitted")
    .map(([member]) => `${args.field}.${member}`);
};

/**
 * Every run-level field, and whether a project's own configuration may set it.
 *
 * A record keyed by the interface rather than a list of the forbidden ones,
 * because a list only ever proves that what it names is a field — never that
 * every field is named, which is the direction that fails open. A field added
 * to `CallidescopeConfiguration` fails to compile here until somebody
 * classifies it, instead of silently becoming settable by any project with
 * nothing in the output to say so.
 *
 * Every field marked `forbidden` names where a run reads from, where it writes
 * to, or how it partitions the workspace — decisions one project cannot make
 * differently from the run tracing it. `limits` is permitted whole: both of its
 * two members are a project's own to gate itself against, and a member that is
 * neither of those two is refused by the schema before this check is reached.
 *
 * `write` is the one field classified a member at a time, because its members
 * split down the same line the record itself does. Where a project's own
 * published section and diagram land is that project's to say — it is the
 * document they are spliced into. The run's own JSON report is not: it is the
 * run's single output.
 */
export const PROJECT_CONFIGURATION_FIELD_PERMISSIONS = {
  directories: "forbidden",
  entryPoints: "permitted",
  exclude: "permitted",
  excludeCallees: "forbidden",
  excludeFrom: "forbidden",
  limits: "permitted",
  write: {
    json: "forbidden",
    markdown: "permitted",
    mermaid: "permitted",
  },
} as const satisfies Record<
  keyof CallidescopeConfiguration,
  | ProjectFieldPermission
  | Record<keyof CallidescopeWriteConfiguration, ProjectFieldPermission>
>;

/**
 * The fields classified a member at a time rather than whole.
 *
 * Read by the permission check to know that finding `write` on a file settles
 * nothing on its own, and that the members underneath it decide. Derived
 * rather than written out, so a field that stops being classified this way
 * stops being listed here in the same edit.
 */
export const PROJECT_CONFIGURATION_NESTED_FIELD_NAMES = new Set(
  Object.entries(PROJECT_CONFIGURATION_FIELD_PERMISSIONS)
    .filter(([, permission]) => typeof permission !== "string")
    .map(([field]) => field),
);

/**
 * The names a project may set, looked up by a field name read off a file.
 *
 * A set of strings rather than the record itself, because the name comes from
 * an authored object rather than from the interface — so a field nothing here
 * classifies is refused rather than waved through, which is the one direction
 * a permission check may be wrong in.
 *
 * A field classified a member at a time contributes its permitted members as
 * dotted names — `write.markdown` — which is the name a reader has to type to
 * fix the file, and so the name a refusal has to print.
 */
export const PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES = new Set(
  Object.entries(PROJECT_CONFIGURATION_FIELD_PERMISSIONS).flatMap(
    ([field, permission]) => readPermittedNames({ field, permission }),
  ),
);

/**
 * The fields named in a refusal, so an agent can fix a project configuration
 * without opening the docs.
 *
 * Derived from the permissions above rather than written out, so the sentence
 * a refusal prints cannot come to disagree with the rule that produced it.
 */
export const PROJECT_CONFIGURATION_PERMITTED_FIELDS = FIELD_LIST_FORMAT.format(
  PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES,
);

/**
 * Every name a project's own configuration must set, in the order checked.
 *
 * Written out rather than derived, because there is nothing at runtime to
 * derive it from: `CallidescopeProjectConfiguration` is a type and vanishes at
 * compile time. The `satisfies` below is what keeps the two honest — a member
 * renamed on the interface stops being assignable here, so it fails to compile
 * rather than quietly stopping being required.
 *
 * A field with an empty member list is required whole and not looked into:
 * `exclude` is an array, and a project writing `[]` has said everything there
 * is to say about its exclusions.
 *
 * Presence, never emptiness. `limits.maximumBreadth: undefined` is a project
 * saying outright that it gates depth and not breadth, and an undefined
 * `write.mermaid` is one saying it publishes no diagram — the two statements an
 * absent field could never distinguish themselves from a project that forgot.
 */
export const PROJECT_CONFIGURATION_REQUIRED_FIELDS = {
  entryPoints: [
    "addresses",
    "decorators",
    "includeExportedFunctions",
    "includeOrphans",
    "includeTests",
  ],
  exclude: [],
  limits: ["maximumBreadth", "maximumDepth"],
  write: ["markdown", "mermaid"],
} as const satisfies Record<
  keyof CallidescopeProjectConfiguration,
  readonly string[]
> & {
  entryPoints: readonly (keyof CallidescopeProjectEntryPoints)[];
  exclude: readonly [];
  limits: readonly (keyof CallidescopeProjectLimits)[];
  write: readonly (keyof CallidescopeProjectWriteConfiguration)[];
};

/** Raised when a configuration file has an extension nothing can read. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unknown configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/**
 * Accepts a function-valued option without inspecting its signature.
 *
 * Zod cannot describe a callback's parameters, and parsing one would replace the
 * caller's function with a wrapper. Checking that it is callable is the whole of
 * what validation can honestly assert here.
 */
const callbackSchema = <TCallback>(): z.ZodType<TCallback> =>
  z.custom<TCallback>((value) => typeof value === "function", {
    message: "Expected a function",
  });

/**
 * The two limits a configuration may declare.
 *
 * Strict rather than stripping: a limit this tool no longer has is a fact
 * about the file that wrote it, and silently discarding the key would leave a
 * configuration author believing a number is in force that nothing reads.
 */
const limitsSchema = z
  .strictObject({
    maximumBreadth: z.number().int().positive().optional(),
    maximumDepth: z.number().int().positive().optional(),
  })
  .optional();

const entryPointsSchema = z
  .strictObject({
    addresses: z.array(z.string()).optional(),
    decorators: z.array(z.string()).optional(),
    includeExportedFunctions: z.boolean().optional(),
    includeOrphans: z.boolean().optional(),
    includeTests: z.boolean().optional(),
  })
  .optional();

/**
 * A marker-delimited block in a markdown file.
 *
 * Shared by the `markdown` and `mermaid` destinations: they differ in what
 * goes between the markers, not in how a block is placed or overridden.
 */
const markdownDestinationSchema = z
  .strictObject({
    description: z.string().optional(),
    endMarker: z.string().optional(),
    heading: z.string().optional(),
    path: z.string(),
    previewCount: z.number().int().nonnegative().optional(),
    render: callbackSchema<RenderMarkdownOutput>().optional(),
    startMarker: z.string().optional(),
    writeBlock: callbackSchema<WriteMarkdownOutput>().optional(),
  })
  .optional();

const writeSchema = z
  .strictObject({
    json: z
      .strictObject({
        indentation: z.number().int().nonnegative().optional(),
        path: z.string(),
      })
      .optional(),
    markdown: markdownDestinationSchema,
    mermaid: markdownDestinationSchema,
  })
  .optional();

/**
 * Validates the shape of a callidescope configuration file.
 *
 * Strict at every level, so a field nothing here names is refused rather than
 * stripped. Stripping is the failure mode that leaves whoever wrote the field
 * believing a limit, an exclusion, or a destination is in force that nothing
 * reads — and every field this tool has ever retired arrives through that same
 * door, along with every name somebody misspells.
 *
 * `ignoreCallees` and `output` are still named as `z.never()` rather than left
 * to strictness, because a key the schema knows by name earns a message saying
 * this field is gone rather than one saying it was never a field.
 */
export const callidescopeConfigurationSchema = z.strictObject({
  directories: z.array(z.string()).optional(),
  entryPoints: entryPointsSchema,
  exclude: z.array(z.string()).optional(),
  excludeCallees: z.array(z.string()).optional(),
  excludeFrom: z.array(z.string()).optional(),
  /** Renamed to `excludeCallees`. */
  ignoreCallees: z.never().optional(),
  limits: limitsSchema,
  /** Renamed to `write`. */
  output: z.never().optional(),
  write: writeSchema,
});

// 🚨 Errors

/** Raised when an explicitly named configuration file does not exist. */
export class ConfigurationFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Configuration file not found: ${filePath}`);
    this.name = "ConfigurationFileNotFoundError";
  }
}

/**
 * Raised when a project's own configuration file cannot be read or parsed.
 *
 * Names the project rather than only the path, because a run resolves a file
 * per project and the failure has to say which one to go and fix. The original
 * failure is kept as `cause` so nothing a reader would need is thrown away.
 */
export class ProjectConfigurationError extends Error {
  constructor(args: {
    cause: unknown;
    configurationPath: string;
    project: string;
  }) {
    const reason =
      args.cause instanceof Error ? args.cause.message : "It could not be read";

    super(
      `Failed to read the callidescope configuration for ${args.project} at ${args.configurationPath}: ${reason}`,
      { cause: args.cause },
    );
    this.name = "ProjectConfigurationError";
  }
}

/**
 * Raised when a project's own configuration sets a field only the workspace
 * configuration may set.
 *
 * Names the project, the offending field, and the four fields a project
 * configuration may set, so the message is actionable without opening a
 * README.
 */
export class ProjectConfigurationFieldNotPermittedError extends Error {
  constructor(args: { field: string; project: string }) {
    super(
      `${args.project} sets ${args.field}, which only the workspace configuration may set. A project configuration may set ${PROJECT_CONFIGURATION_PERMITTED_FIELDS}.`,
    );
    this.name = "ProjectConfigurationFieldNotPermittedError";
  }
}

/**
 * Raised when a traced project's configuration leaves a field out.
 *
 * Names the field as a reader has to type it to fix the file — `write.mermaid`
 * rather than `write` — and points at the spread that supplies every field a
 * project has no opinion about, because the fix is almost always that one line
 * rather than a field written out by hand.
 */
export class ProjectConfigurationIncompleteError extends Error {
  constructor(args: { field: string; project: string }) {
    super(
      `${args.project} leaves ${args.field} out of its callidescope configuration, which must be complete. Spread the workspace's projectDefaults and override what this project means to.`,
    );
    this.name = "ProjectConfigurationIncompleteError";
  }
}

/**
 * Raised when a traced project has no configuration file at all.
 *
 * A project that is traced is judged, and what it is judged by is written in
 * its own file or nowhere. Inheriting everything in silence is the arrangement
 * this replaces: it left a project's numbers resolvable only by reading two
 * files and knowing which one won.
 */
export class ProjectConfigurationMissingError extends Error {
  constructor(project: string) {
    super(
      `${project} is traced but has no callidescope.config.ts. Every traced project declares its own, spreading the workspace's projectDefaults and overriding what it means to.`,
    );
    this.name = "ProjectConfigurationMissingError";
  }
}
