// ♟️ Constants

import { z } from "zod";

import type {
  CodependixExportTarget,
  CodependixGraphType,
} from "./configuration.types";

/** Raised when the configuration path points to an unsupported file type. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/** Graph levels codependix can build. */
export const CODEPENDIX_GRAPH_TYPES = [
  "fileImports",
  "nestjsModules",
  "nxProjects",
] as const satisfies readonly CodependixGraphType[];

/** Export targets a graph type may be configured with, per project. */
export const CODEPENDIX_EXPORT_TARGETS = [
  "both",
  "json",
  "markdown",
  "none",
] as const satisfies readonly CodependixExportTarget[];

/** Extensions the configuration loader can read. */
export const SUPPORTED_CONFIGURATION_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".mjs",
  ".mts",
  ".ts",
]);

/**
 * File names searched for when no configuration path is given.
 *
 * Searched in order, so a workspace carrying both a TypeScript and a JSON
 * configuration file gets the TypeScript one.
 */
export const CONFIGURATION_FILE_NAMES = [
  "codependix.config.ts",
  "codependix.config.mts",
  "codependix.config.cts",
  "codependix.config.js",
  "codependix.config.mjs",
  "codependix.config.cjs",
  "codependix.config.json",
] as const;

/** Export target applied to a graph type naming none. */
export const DEFAULT_EXPORT_TARGET: CodependixExportTarget = "none";

/** Markdown file an anchor-mode destination writes into when it names none. */
export const DEFAULT_MARKDOWN_PATH = "README.md";

/**
 * Projects that participate in graph export when a configuration names none.
 *
 * Deliberately empty: participation is always declared. A configuration that
 * names `defaults` but no `include` exports nothing rather than quietly
 * covering the whole workspace, which is what lets a later widening argument
 * mean something — a union with `["**"]` as its base can never add a project.
 */
export const DEFAULT_INCLUDE_GLOBS = [] as const;

/**
 * Marks the workspace root during an upward search from the process cwd.
 *
 * A package manifest is deliberately not one of them: every project in the
 * workspace carries one, so the search would stop at the nearest project
 * rather than the root a configuration path was written relative to.
 */
export const REPOSITORY_ROOT_MARKERS = [".git", "pnpm-workspace.yaml"] as const;

/** Separates the entries of a `--projects` or `--tags` argument. */
export const SELECTION_SEPARATOR = ",";

/**
 * Validates one end of an access rule, or an acyclic rule's scope.
 *
 * At least one field is required: a selector stating nothing reads exactly
 * like a typo, and treating it as "every node" would silently widen a rule to
 * the whole graph.
 */
const boundarySelectorSchema = z
  .object({
    id: z.array(z.string().min(1)).min(1).optional(),
    path: z.array(z.string().min(1)).min(1).optional(),
    project: z.array(z.string().min(1)).min(1).optional(),
    tags: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine(
    (selector) => Object.values(selector).some((value) => value !== undefined),
    {
      message:
        "A selector needs at least one of id, path, project, or tags — otherwise nothing says which nodes it means.",
    },
  );

/** Validates the edge attributes a rule may narrow itself to. */
const boundaryEdgeSelectorSchema = z.object({
  implicit: z.boolean().optional(),
});

/** Validates one declared boundary rule, of either kind. */
const boundaryRuleSchema = z.union([
  z.object({
    edges: boundaryEdgeSelectorSchema.optional(),
    from: boundarySelectorSchema,
    kind: z.enum(["allow", "forbid"]),
    message: z.string().min(1).optional(),
    name: z.string().min(1),
    to: boundarySelectorSchema,
  }),
  z.object({
    kind: z.literal("acyclic"),
    message: z.string().min(1).optional(),
    name: z.string().min(1),
    nodes: boundarySelectorSchema.optional(),
  }),
]);

/**
 * Validates `boundaries.fileImports`'s rules, nested by language.
 *
 * Cross-language edges cannot exist — a Python file cannot import a
 * TypeScript file or vice versa — so rule authoring stays language-scoped
 * even though `codependix-file-imports` builds and exports both as one graph
 * type.
 */
const fileImportsBoundariesConfigurationSchema = z.object({
  python: z.array(boundaryRuleSchema).optional(),
  typescript: z.array(boundaryRuleSchema).optional(),
});

/** Validates every declared boundary rule, keyed by graph level. */
const boundariesConfigurationSchema = z.object({
  fileImports: fileImportsBoundariesConfigurationSchema.optional(),
  nestjsModules: z.array(boundaryRuleSchema).optional(),
  nxProjects: z.array(boundaryRuleSchema).optional(),
});

/** Validates one graph type's export configuration. */
const graphOutputSchema = z
  .object({
    json: z.object({ path: z.string().min(1) }).optional(),
    markdown: z
      .object({
        anchor: z.string().min(1).optional(),
        path: z.string().min(1).optional(),
      })
      .optional(),
    target: z.enum(CODEPENDIX_EXPORT_TARGETS).optional(),
  })
  .superRefine((output, context) => {
    const target = output.target ?? DEFAULT_EXPORT_TARGET;
    const needsJson = target === "both" || target === "json";
    const needsMarkdown = target === "both" || target === "markdown";

    if (needsJson && output.json === undefined) {
      context.addIssue({
        code: "custom",
        message: `A "${target}" export target needs a json destination.`,
      });
    }

    if (needsMarkdown && output.markdown === undefined) {
      context.addIssue({
        code: "custom",
        message: `A "${target}" export target needs a markdown destination.`,
      });
    }

    if (
      output.markdown !== undefined &&
      output.markdown.anchor === undefined &&
      output.markdown.path === undefined
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A markdown destination needs an anchor, a path, or both — otherwise nothing names where the export goes.",
      });
    }
  });

/**
 * Validates a project's own `codependix.config.ts`, keyed by graph type.
 *
 * The same shape a project's own file spreads `projectDefaults` into, and the
 * same shape the root configuration's schema no longer carries — a project's
 * export configuration is validated from its own file rather than from a root
 * `projects` dict.
 */
export const codependixProjectConfigurationSchema = z.object({
  fileImports: graphOutputSchema.optional(),
  nestjsModules: graphOutputSchema.optional(),
  nxProjects: graphOutputSchema.optional(),
});

/**
 * Validates the Workspace Graph's export configuration.
 *
 * All three graph types are accepted: `fileImports` and `nestjsModules` each
 * build a whole-workspace aggregate graph the same way `nxProjects` always
 * has.
 */
const workspaceConfigurationSchema = z.object({
  fileImports: graphOutputSchema.optional(),
  nestjsModules: graphOutputSchema.optional(),
  nxProjects: graphOutputSchema.optional(),
});

/**
 * Validates a codependix configuration file's contents.
 *
 * Zod strips unknown keys rather than rejecting them, so a configuration
 * written for a newer codependix still loads under an older one instead of
 * failing on a field it has no opinion about.
 */
export const codependixConfigurationSchema = z.object({
  boundaries: boundariesConfigurationSchema.optional(),
  exclude: z.array(z.string()).optional(),
  include: z.array(z.string()).optional(),
  projectGraph: z.string().optional(),
  workspace: workspaceConfigurationSchema.optional(),
});

/** What `--check boundaries` asks the run to fail on: an edge breaking a rule. */
export const CHECK_BOUNDARIES = "boundaries";

/** What `--check reports` asks the run to fail on: a stale configured export. */
export const CHECK_REPORTS = "reports";

/**
 * Everything `--check` accepts, in the order an error message lists them.
 *
 * Named here rather than spelled into each message, so the list a mistake is
 * measured against and the list it is told about can never drift apart. The
 * same arrangement `codometer` and `callidescope` both use, and `reports` is
 * deliberately their word spelled the same way: a configured destination has
 * gone stale is one finding across all three tools, and two names for it
 * would make the three reports unreadable together.
 */
export const CHECK_NAMES = [CHECK_BOUNDARIES, CHECK_REPORTS];

/** How a `--check` value is written: one comma-separated set, no spaces needed. */
export const CHECK_SEPARATOR = ",";

/**
 * What a command line naming no mode at all is asked to choose between.
 *
 * Three choices rather than the two `--check`/`--write` used to offer, since
 * `--check` now names which finding it gates. Kept as a prompt rather than
 * defaulted to anything: a run that silently did nothing and exited 0 is the
 * failure this whole flag arrangement exists to prevent.
 */
export const RUN_MODE_CHOICES = [
  CHECK_BOUNDARIES,
  CHECK_REPORTS,
  "write",
] as const;

/** What the prompt calls the thing it is asking for, in its error messages. */
export const RUN_MODE_SUBJECT = "A run mode (--check or --write)";

// 🚨 Errors

/** Raised when an explicitly named configuration file does not exist. */
export class ConfigurationFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Configuration file not found: ${filePath}`);
    this.name = "ConfigurationFileNotFoundError";
  }
}
