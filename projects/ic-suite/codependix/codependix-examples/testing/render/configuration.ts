import path from "node:path";

import { codependixConfigurationSchema } from "@codependix/configuration";
import { z } from "zod";

import { getConfigurationService } from "./builders";
import { fence, fenceJson, table } from "./document";
import { resolveExample } from "./paths";

import type { ExampleDocument, ExampleSection } from "./types";
import type {
  CodependixGraphType,
  CodependixProjectConfiguration,
  ConfigurationService,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";

// ♟️ Constants

/** Path segment every configuration example sits under, inside `examples/`. */
const CONFIGURATION_SEGMENT = "configuration-resolution";

/** Path segment the refusal examples sit under, inside `examples/`. */
const REFUSALS_SEGMENT = "refusals";

/** Workspace carrying both a TypeScript and a JSON configuration file. */
const PRECEDENCE = "precedence";

/** Workspace whose configuration sits above a nested project's `package.json`. */
const NESTED = "nested";

/** Workspace whose configuration carries a field codependix does not know. */
const UNKNOWN_FIELDS = "unknown-fields";

/** Directory holding no configuration file at all. */
const ABSENT = "absent";

/** Configuration file with an extension the loader cannot read. */
const UNSUPPORTED_TYPE = "unsupported-type";

/** Nested project the upward search has to reach past. */
const NESTED_PROJECT_SEGMENT = "packages/atlas-service";

/** Configuration file name that does not exist, for the explicit-path refusal. */
const MISSING_CONFIGURATION_FILE = "codependix.config.missing.ts";

/** Workspace demonstrating the per-project-file resolution model. */
const PER_PROJECT_FILES = "per-project-files";

/**
 * The refusals a configuration file can be rejected with.
 *
 * Each is a real configuration object handed to `codependixConfigurationSchema`,
 * so the message rendered into the example is the message a reader would get.
 */
const REFUSED_CONFIGURATIONS = [
  {
    configuration: { workspace: { nxProjects: { target: "both" } } },
    title: "A `both` target with no `json` destination",
  },
  {
    configuration: { workspace: { nxProjects: { target: "json" } } },
    title: "A `json` target with no `json` destination",
  },
  {
    configuration: {
      workspace: {
        nxProjects: { json: { path: "graph.json" }, target: "both" },
      },
    },
    title: "A `both` target with no `markdown` destination",
  },
  {
    configuration: { workspace: { nxProjects: { target: "markdown" } } },
    title: "A `markdown` target with no `markdown` destination",
  },
  {
    configuration: {
      workspace: { nxProjects: { markdown: {}, target: "markdown" } },
    },
    title: "A `markdown` destination naming neither an anchor nor a path",
  },
] as const;

// ⚙️ Resolution

/** Builds every configuration example document. */
export async function buildConfigurationDocuments(): Promise<
  ExampleDocument[]
> {
  return [
    {
      id: "configuration-resolution",
      jsonExports: [],
      sections: [
        ...(await buildResolutionSections()),
        ...(await buildDiscoverySections()),
      ],
      summary:
        "Every configuration field, resolved by the real loader — including the two a reader is most likely to assume wrongly.",
      title: "Configuration resolution, field by field",
    },
    {
      id: "refusals",
      jsonExports: [],
      sections: [
        ...buildParseRefusalSections(),
        ...(await buildPathRefusalSections()),
      ],
      summary:
        "Every way codependix refuses a configuration or a command line, each with the reproduction that produces it — because a refusal is where a reader gets stuck.",
      title: "Every refusal, with its reproduction",
    },
  ];
}

/** Builds one section per configuration the schema refuses. */
export function buildParseRefusalSections(): ExampleSection[] {
  return REFUSED_CONFIGURATIONS.map((refusal) => ({
    body: fence(describeParseRefusal(refusal.configuration)),
    heading: refusal.title,
    note: `Reproduced by \`codependixConfigurationSchema.parse(${JSON.stringify(refusal.configuration)})\`.`,
  }));
}

/** Describes where a resolved output would be written. */
export function describeDestination(resolved: {
  json: undefined | { path: string };
  markdown: undefined | { anchor: string | undefined; path: string };
}): string {
  const parts: string[] = [];

  if (resolved.json !== undefined) parts.push(`json \`${resolved.json.path}\``);
  if (resolved.markdown !== undefined) {
    const anchor =
      resolved.markdown.anchor === undefined
        ? ""
        : ` anchor \`${resolved.markdown.anchor}\``;

    parts.push(`markdown \`${resolved.markdown.path}\`${anchor}`);
  }

  return parts.length === 0 ? "_none_" : parts.join(", ");
}

/** Describes a raised value, whether or not it was an `Error`. */
export function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

/** Lists a raised validation error's messages, one per line. */
export function describeIssues(error: unknown): string {
  return error instanceof z.ZodError
    ? error.issues.map((issue) => issue.message).join("\n")
    : describeError(error);
}

/** Loads a configuration by naming its path explicitly, reporting a refusal. */
export async function describeLoadRefusal(
  relativePath: string,
): Promise<string> {
  const configurationService = await getConfigurationService();

  try {
    await configurationService.loadConfiguration({
      configurationPath: resolveExample(REFUSALS_SEGMENT, relativePath),
    });
  } catch (error) {
    return redactPath(describeError(error));
  }

  /* v8 ignore next -- both configurations named here are refused */
  return "loaded";
}

/** Renders one refusal as the message a reader would actually be shown. */
export function describeParseRefusal(configuration: unknown): string {
  try {
    codependixConfigurationSchema.parse(configuration);
  } catch (error) {
    return describeIssues(error);
  }

  /* v8 ignore next -- every configuration in REFUSED_CONFIGURATIONS is refused */
  return "accepted";
}

// 📄 Documents

/** Loads one configuration example by searching upward from its directory. */
export async function loadConfiguration(
  name: string,
): Promise<ResolvedCodependixConfiguration> {
  const configurationService = await getConfigurationService();

  return configurationService.loadConfiguration({
    searchDirectory: resolveExample(CONFIGURATION_SEGMENT, name),
  });
}

/**
 * Replaces an absolute path with a repository-relative one.
 *
 * A committed example that carried the absolute path of whichever machine
 * rendered it would fail `examples --check` everywhere else.
 */
export function redactPath(message: string): string {
  return message.replaceAll(
    resolveExample(REFUSALS_SEGMENT),
    "<examples>/refusals",
  );
}

/** Builds the sections covering how a configuration file is found and read. */
async function buildDiscoverySections(): Promise<ExampleSection[]> {
  const configurationService = await getConfigurationService();
  const precedence = await loadConfiguration(PRECEDENCE);
  const nested = await configurationService.loadConfiguration({
    searchDirectory: resolveExample(
      CONFIGURATION_SEGMENT,
      NESTED,
      NESTED_PROJECT_SEGMENT,
    ),
  });
  const absent = await loadConfiguration(ABSENT);
  const unknownFields = await loadConfiguration(UNKNOWN_FIELDS);

  return [
    {
      body: fenceJson(precedence.workspace),
      heading: "A workspace carrying two configuration files",
      note: "`examples/configuration/precedence/` holds both a `codependix.config.ts` and a `codependix.config.json`. `CONFIGURATION_FILE_NAMES` is searched in order, so the TypeScript one wins — the anchor here is the one it declares.",
    },
    {
      body: fenceJson(nested.workspace),
      heading: "The upward search reaches past a nested `package.json`",
      note: "The search started inside `packages/atlas-service/`, which carries its own `package.json`, and still found the configuration at the workspace root — the root every path in that configuration was written relative to. A project's own `codependix.config.ts` is searched for differently — see the next section — and never walks upward this way.",
    },
    {
      body: fenceJson(
        configurationService.resolveForProject({
          configuration: absent,
          graphType: "nxProjects",
          projectConfiguration: undefined,
          projectName: "atlas-service",
        }),
      ),
      heading: "No configuration file at all",
      note: 'A workspace that never wrote one resolves every graph to `target: "none"` and produces nothing, rather than being told to write one. The absence of an unnamed configuration file is legal.',
    },
    {
      body: fenceJson(unknownFields.workspace),
      heading: "An unknown field is stripped, not rejected",
      note: "The configuration declares a `graphqlSchemas` field no codependix has an opinion about. Zod strips unknown keys, so a configuration written for a newer codependix still loads under an older one.",
    },
  ];
}

/** Builds the two refusals that come from the configuration path itself. */
async function buildPathRefusalSections(): Promise<ExampleSection[]> {
  return [
    {
      body: fence(await describeLoadRefusal(MISSING_CONFIGURATION_FILE)),
      heading: "An explicitly named configuration file that does not exist",
      note: "A path named on the command line must exist: a typo in a task runner's arguments should fail rather than quietly resolving every graph to `none`. A path that was _not_ named is searched for, and its absence is legal — see [configuration-resolution](../configuration-resolution).",
    },
    {
      body: fence(
        await describeLoadRefusal(
          path.join(UNSUPPORTED_TYPE, "codependix.config.yaml"),
        ),
      ),
      heading: "A configuration file the loader cannot read",
      note: "`SUPPORTED_CONFIGURATION_EXTENSIONS` covers `.cjs`, `.cts`, `.js`, `.json`, `.mjs`, `.mts`, and `.ts`. Anything else raises `UnknownConfigurationFileTypeError`.",
    },
  ];
}

/**
 * Builds the sections covering a project's own file, no file at all, and the
 * two glob lists.
 */
async function buildResolutionSections(): Promise<ExampleSection[]> {
  const configurationService = await getConfigurationService();
  const configuration = buildSampleConfiguration(configurationService);
  const atlasCoreProjectConfiguration =
    await loadExampleProjectConfiguration("atlas-core");
  const atlasServiceProjectConfiguration =
    await loadExampleProjectConfiguration("atlas-service");

  return [
    {
      body: table(
        ["Project", "Own file?", "Resolved target", "Destination"],
        [
          resolveRow({
            configuration,
            configurationService,
            projectConfiguration: atlasCoreProjectConfiguration,
            projectName: "atlas-core",
            projectRoot: "packages/atlas-core",
          }),
          resolveRow({
            configuration,
            configurationService,
            projectConfiguration: atlasServiceProjectConfiguration,
            projectName: "atlas-service",
            projectRoot: "packages/atlas-service",
          }),
          resolveRow({
            configuration,
            configurationService,
            projectConfiguration: undefined,
            projectName: "atlas-application",
            projectRoot: "applications/atlas-application",
          }),
          resolveRow({
            configuration,
            configurationService,
            projectConfiguration: undefined,
            projectName: "unrelated",
            projectRoot: "tools/unrelated",
          }),
        ],
      ),
      heading:
        "A project's own file, an included project with no file, and the two glob lists",
      note: '`atlas-core` carries its own `codependix.config.ts` — see the next section for how it spreads `projectDefaults` — and is read exactly as loaded, with no further merge. `atlas-service` names no file of its own, and resolves to `"none"` even though `include` matches it: a project matched by `include` with no file of its own produces no per-project output. `atlas-application` matches `exclude`, so it resolves to `"none"` no matter what its own file would otherwise say. `unrelated` matches no `include` glob at all.',
    },
    {
      body: fenceJson({
        atlasCore: atlasCoreProjectConfiguration,
        // `undefined` would be dropped entirely by `JSON.stringify` — `null`
        // is what makes "no file at all" visible in the rendered example.
        atlasService: atlasServiceProjectConfiguration ?? null,
      }),
      heading: "`projectDefaults`, spread and then overridden",
      note: "`examples/configuration-resolution/per-project-files/codependix.config.ts` exports `projectDefaults`. Its `packages/atlas-core/codependix.config.ts` spreads it and overrides `nxProjects` outright — the spread's `markdown` destination is gone, not merged with the `json` one that replaced it. `packages/atlas-service/` carries no `codependix.config.ts` at all, so `loadProjectConfiguration` resolves it to `undefined` rather than falling back to `projectDefaults` on its own — a project opts in by writing the file.",
    },
    {
      body: renderInclusion(configurationService, configuration),
      heading: "`include` and `exclude` match a name or a root",
      note: "Both lists are matched against a project's name **and** its workspace-relative root. `atlas-service` matches no glob by name and matches `packages/*` by root, so a caller that knows the root gets a different answer from one that does not — which is why `projectRoot` is optional rather than absent.",
    },
    {
      body: fenceJson(
        configurationService.resolveForWorkspace(configuration, "nxProjects"),
      ),
      heading: "The Workspace Graph ignores both glob lists",
      note: "It is exported once for the repository rather than once per project, so it carries no per-project override and `include`/`exclude` never apply to it. `--projects` and `--tags` are the exception: they narrow which projects are **nodes** in it, while its destination is still read from `workspace.nxProjects`.",
    },
  ];
}

/** The configuration every resolution row is resolved against. */
function buildSampleConfiguration(
  configurationService: ConfigurationService,
): ResolvedCodependixConfiguration {
  return configurationService.resolveConfiguration({
    exclude: ["applications/*"],
    include: ["packages/*", "codependix-*"],
    workspace: {
      nxProjects: {
        markdown: { anchor: "example-workspace" },
        target: "markdown",
      },
    },
  });
}

/** Loads one `per-project-files` example project's own configuration file. */
async function loadExampleProjectConfiguration(
  projectName: string,
): Promise<CodependixProjectConfiguration | undefined> {
  const configurationService = await getConfigurationService();

  return configurationService.loadProjectConfiguration({
    projectRoot: resolveExample(
      CONFIGURATION_SEGMENT,
      PER_PROJECT_FILES,
      "packages",
      projectName,
    ),
  });
}

/** Renders what `isProjectIncluded` answers, with and without a root. */
function renderInclusion(
  configurationService: ConfigurationService,
  configuration: ResolvedCodependixConfiguration,
): string {
  const answer = (projectName: string, projectRoot?: string): string =>
    String(
      configurationService.isProjectIncluded({
        configuration,
        projectName,
        projectRoot,
      }),
    );

  return fence(
    [
      'include: ["packages/*", "codependix-*"]',
      "",
      `atlas-service, name only                        → ${answer("atlas-service")}`,
      `atlas-service, name and packages/atlas-service  → ${answer("atlas-service", "packages/atlas-service")}`,
      `codependix-examples, name only                  → ${answer("codependix-examples")}`,
    ].join("\n"),
  );
}

/** Resolves one project's `nxProjects` output and describes it as a table row. */
function resolveRow(args: {
  configuration: ResolvedCodependixConfiguration;
  configurationService: ConfigurationService;
  projectConfiguration: CodependixProjectConfiguration | undefined;
  projectName: string;
  projectRoot: string;
}): string[] {
  const {
    configuration,
    configurationService,
    projectConfiguration,
    projectName,
    projectRoot,
  } = args;
  const graphType: CodependixGraphType = "nxProjects";
  const resolved = configurationService.resolveForProject({
    configuration,
    graphType,
    projectConfiguration,
    projectName,
    projectRoot,
  });

  return [
    `\`${projectName}\``,
    projectConfiguration === undefined ? "no" : "yes",
    `\`${resolved.target}\``,
    describeDestination(resolved),
  ];
}
