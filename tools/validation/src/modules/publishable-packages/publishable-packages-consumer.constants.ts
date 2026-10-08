// ♟️ Constants

import type {
  ConsumerCommandResult,
  PluginTargetExpectation,
} from "./publishable-packages.types";

/**
 * Environment variable naming the directory a consumer is created beneath.
 *
 * Unset, the operating system's temporary directory is used. Either way the
 * directory, and every directory above it, must hold no `package.json`,
 * `node_modules`, or `pnpm-workspace.yaml`: a consumer beneath one of those
 * resolves the packages they hold instead of its own, which hides exactly the
 * install bugs this check exists to catch.
 */
export const CONSUMER_ROOT_VARIABLE = "PUBLISHABLE_PACKAGES_CONSUMER_ROOT";

/** Prefix of each consumer directory, completed by `mkdtemp`. */
export const CONSUMER_DIRECTORY_PREFIX = "publishable-packages-consumer-";

/** Files whose presence makes a directory a package or workspace root. */
export const WORKSPACE_MARKERS = [
  "node_modules",
  "package.json",
  "pnpm-workspace.yaml",
] as const;

/**
 * npm, pnpm, and Nx subcommands that publish, retag, or authenticate.
 *
 * A tripwire, not the guarantee: every command this check runs is written in
 * this module, and none of them writes to a registry. The tripwire exists
 * because every ic-suite manifest pins `publishConfig.registry` to npmjs,
 * which overrides any `--registry` flag, so a stray publish added here later
 * would be a real release.
 */
export const REGISTRY_WRITE_ARGUMENTS: ReadonlySet<string> = new Set([
  "access",
  "add-user",
  "adduser",
  "deprecate",
  "dist-tag",
  "dist-tags",
  "login",
  "owner",
  "publish",
  "release",
  "team",
  "token",
  "unpublish",
]);

/** Suffix of the target Nx release infers to publish one project. */
export const RELEASE_PUBLISH_TARGET_SUFFIX = ":nx-release-publish";

/**
 * Environment variables a consumer command never inherits.
 *
 * `NX_*` from a parent Nx task would point the consumer's Nx at this
 * workspace, `npm_*` and `pnpm_config_*` carry this workspace's package
 * manager settings and any registry token, and `NODE_OPTIONS` or the swc
 * project variables could load this workspace's TypeScript hooks.
 */
export const INHERITED_VARIABLE_PATTERN =
  /^(?:npm_|nx_|pnpm_config_|force_color$|init_cwd$|node_auth_token$|node_options$|node_path$|swc_node_project$|ts_node_project$)/i;

/**
 * A terminal control sequence, such as the colors pino and Nx print even
 * under `FORCE_COLOR=0`, so output is matched as the text a person reads.
 * Built from the escape character's code point, which a regular expression
 * literal could only spell as a control character.
 */
export const ESCAPE_SEQUENCE_PATTERN = new RegExp(
  String.raw`${String.fromCodePoint(0x1b)}\[[\d;?]*[ -/]*[@-~]`,
  "gu",
);

/** Milliseconds `pnpm install` may take on an oversubscribed runner. */
export const INSTALL_TIMEOUT = 600_000;

/**
 * Largest output a consumer command may print. Node's default of 1 MiB is
 * within reach of an append-only install log, which would then read as a
 * failed install.
 */
export const MAXIMUM_OUTPUT_BYTES = 64 * 1024 * 1024;

/** Milliseconds any other consumer command may take. */
export const COMMAND_TIMEOUT = 300_000;

/** Lines of a failed command's output repeated in its failure message. */
export const FAILURE_OUTPUT_LINES = 40;

/** Builds the consumer's own `pnpm` approves, as this workspace does. */
export const CONSUMER_ALLOWED_BUILDS = ["@swc/core", "nx"] as const;

/** Minutes a dependency must have been published before it is installed. */
export const CONSUMER_MINIMUM_RELEASE_AGE = 1440;

/** Tools the consumer pins to the versions this workspace has installed. */
export const CONSUMER_TOOLS = ["@types/node", "nx", "typescript"] as const;

/** Fixture project whose every gate must pass. */
export const HEALTHY_PROJECT = "healthy";

/** Fixture project whose every gate must fail, for a known reason. */
export const BROKEN_PROJECT = "broken";

/** Name the generator writes into the healthy fixture. */
export const GENERATED_INSTANCE = "generated";

/** The one generator the consumer's conformetry configuration declares. */
export const CONSUMER_GENERATOR = "greeting";

/**
 * One inferred target per Nx plugin, each with the text its failing fixture
 * prints when the gate itself ran: a depth breach, a forbidden edge, and an
 * instance drifted from its template.
 */
export const PLUGIN_TARGET_EXPECTATIONS: readonly PluginTargetExpectation[] = [
  {
    failure: "Call stacks over the depth limit (1)",
    plugin: "@callidescope/nx",
    target: "callidescope-gate",
  },
  {
    failure: "broken-does-not-reach-healthy",
    plugin: "@codependix/nx",
    target: "codependix-gate",
  },
  {
    failure: 'Missing markdown heading: "Usage"',
    plugin: "@conformetry/nx",
    target: "conformetry-validate",
  },
];

/** Directory, inside the consumer, holding one import file per package. */
export const TYPECHECK_DIRECTORY = "typecheck";

/** Configuration the per-package import check typechecks with. */
export const TYPECHECK_CONFIGURATION = "tsconfig.typecheck.json";

/**
 * What {@link TYPECHECK_CONFIGURATION} holds: every import file, strictly.
 * Written as JSON text because its keys are TypeScript's own option names.
 * Library checking stays off: with it on, `nx`'s and `thread-stream`'s own
 * declarations fail, which says nothing about the packages under test.
 */
export const TYPECHECK_CONFIGURATION_CONTENT = `{
  "compilerOptions": {
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2023",
    "types": ["node"]
  },
  "include": ["${TYPECHECK_DIRECTORY}/*.ts"]
}
`;

/**
 * Describes a consumer command that failed, ending with the last lines it
 * printed so a CI log names the cause without a rerun.
 */
export const formatCommandFailure = (
  description: string,
  result: ConsumerCommandResult,
): string => {
  const lines = result.output.trimEnd().split("\n");
  const tail = lines.slice(-FAILURE_OUTPUT_LINES).join("\n");

  return `❌ ${description} (exit ${String(result.status)}):\n${tail}`;
};
