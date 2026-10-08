// ♟️ Constants

/**
 * Compiler options at the consumer's root. The codependix gate's loader reads
 * them from the working directory, and the boundary check boots NestJS
 * containers whose constructor injection needs decorator metadata.
 */
const ROOT_TSCONFIG = {
  compilerOptions: {
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    module: "nodenext",
    moduleResolution: "nodenext",
    strict: true,
    target: "es2022",
  },
};

/** Registers all three Nx plugins, each with its target named explicitly. */
const NX_CONFIGURATION = {
  plugins: [
    {
      options: {
        configurationPath: "callidescope.config.ts",
        gateTargetName: "callidescope-gate",
      },
      plugin: "@callidescope/nx",
    },
    {
      options: {
        configurationPath: "codependix.config.ts",
        gateTargetName: "codependix-gate",
      },
      plugin: "@codependix/nx",
    },
    {
      options: {
        configurationPath: "conformetry.config.ts",
        validateTargetName: "conformetry-validate",
      },
      plugin: "@conformetry/nx",
    },
  ],
};

/** A forbidden edge the broken fixture's implicit dependency breaks. */
const CODEPENDIX_CONFIGURATION = `export default {
  boundaries: {
    nxProjects: [
      {
        from: { tags: ["smoke:broken"] },
        kind: "forbid",
        message: "A broken fixture must not depend on the healthy one.",
        name: "broken-does-not-reach-healthy",
        to: { tags: ["smoke:healthy"] },
      },
    ],
  },
};
`;

/** One template, located inside every project tagged for it. */
const CONFORMETRY_CONFIGURATION = `export default [
  {
    description: "One markdown file per greeting",
    inputs: {
      name: { description: "Greeting name in kebab-case", type: "string" },
    },
    instances: [{ patterns: ["src/greetings/*"], tags: ["smoke:conformetry"] }],
    name: "greeting",
    templatePath: "templates/greeting",
  },
];
`;

/**
 * A project's complete callidescope configuration: the gate refuses one that
 * leaves a field out.
 */
const createCallidescopeConfiguration = (maximumDepth: number): string =>
  `export default {
  entryPoints: {
    addresses: [],
    decorators: [],
    includeExportedFunctions: true,
    includeOrphans: true,
    includeTests: false,
  },
  exclude: [],
  limits: { maximumBreadth: 4, maximumDepth: ${String(maximumDepth)} },
  write: { markdown: undefined, mermaid: undefined },
};
`;

/** Serializes a JSON file the way a person would write it. */
const toJson = (value: unknown): string =>
  `${JSON.stringify(value, undefined, 2)}\n`;

/**
 * Every file of the consumer that does not depend on the packages being
 * verified, keyed by its path relative to the consumer's root.
 *
 * `healthy` passes every gate. `broken` fails each for a reason its gate must
 * name: a four-deep call chain held to depth 2, an implicit dependency on
 * `healthy` that the codependix rule forbids, and a greeting drifted from its
 * template.
 */
export const CONSUMER_FIXTURE_FILES: Readonly<Record<string, string>> = {
  ".gitignore": ".conformetry\n.nx\nnode_modules\n",
  ".npmrc": "registry=https://registry.npmjs.org/\n",
  ".npmrc-user": "",
  "callidescope.config.ts": "export default { limits: { maximumDepth: 6 } };\n",
  "codependix.config.ts": CODEPENDIX_CONFIGURATION,
  "conformetry.config.ts": CONFORMETRY_CONFIGURATION,
  "nx.json": toJson(NX_CONFIGURATION),
  "projects/broken/callidescope.config.ts": createCallidescopeConfiguration(2),
  "projects/broken/project.json": toJson({
    implicitDependencies: ["healthy"],
    name: "broken",
    projectType: "library",
    sourceRoot: "projects/broken/src",
    tags: ["smoke:broken", "smoke:conformetry"],
  }),
  "projects/broken/src/broken.ts": `function fourth(): number {
  return 1;
}
function third(): number {
  return fourth();
}
function second(): number {
  return third();
}
export function first(): number {
  return second();
}
`,
  "projects/broken/src/greetings/broken/broken.md":
    "# Something Else Entirely\n\nNothing here matches.\n",
  "projects/broken/tsconfig.json": toJson({
    extends: "../../tsconfig.json",
    include: ["src/**/*.ts"],
  }),
  "projects/healthy/callidescope.config.ts": createCallidescopeConfiguration(6),
  "projects/healthy/project.json": toJson({
    name: "healthy",
    projectType: "library",
    sourceRoot: "projects/healthy/src",
    tags: ["smoke:healthy", "smoke:conformetry"],
  }),
  "projects/healthy/src/greetings/healthy/healthy.md":
    "# Healthy\n\n## Usage\n\nSay hello to healthy.\n",
  "projects/healthy/src/healthy.ts":
    "export function healthy(): number {\n  return 1;\n}\n",
  "projects/healthy/tsconfig.json": toJson({
    extends: "../../tsconfig.json",
    include: ["src/**/*.ts"],
  }),
  "templates/greeting/{{nameKebabCase}}/{{nameKebabCase}}.md":
    "# {{namePascalCase}}\n\n## Usage\n\nSay hello to {{nameKebabCase}}.\n",
  "tsconfig.json": toJson(ROOT_TSCONFIG),
};
