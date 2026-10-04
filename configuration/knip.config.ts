import type { KnipConfig } from "knip";

const config: KnipConfig = {
  $schema: "https://unpkg.com/knip@5/schema.json",

  // Globally ignored file patterns (tests, build output, caches)
  // Every project carries a codometer.config.ts that the codometer command line
  // reads by walking upward from the directory it measures. Nothing imports it,
  // the way nothing imports eslint.config.ts — but knip has a plugin that knows
  // about eslint and none that knows about codometer, so it is named here. A
  // project's callidescope.config.ts is found the same way — resolved by name
  // beside every project a trace reaches, never imported — so it is named here
  // for the same reason. A project's own codependix.config.ts is optional and
  // resolved the same way — beside every project a run maps, never imported —
  // so it is named here too.
  ignore: [
    "**/*.test.ts",
    "**/callidescope.config.ts",
    "**/codependix.config.ts",
    "**/codometer.config.ts",
    "notepads/**",
  ],

  // Blank constants/types files are conformance placeholders; keep them out of unused-file checks only.
  // testing/mocks.ts files are conformance placeholders for project-level test utilities (used by future tests).
  ignoreFiles: [
    "**/src/**/*.constants.ts",
    "**/src/**/*.types.ts",
    "**/testing/mocks.ts",
  ],

  // Binaries invoked via project.json targets or scripts, not imported in code
  ignoreBinaries: [
    "terraform", // Terraform CLI, used for infrastructure provisioning
    "gitleaks", // Gitleaks CLI, used for detecting hardcoded secrets
    "trivy", // Trivy CLI, used for security scanning (container images & infrastructure)
    "uv", // uv Python package manager, used in lint-staged for nbstripout
    "validate-branch-name",
    "validate-pull-request-body",
    "pull-request-release-significance",
  ],

  // Dependencies nothing imports, each verified live: remove one and knip
  // reports it. The list was twice this size, and the surplus had outlived
  // whatever once needed it — `configuration/fallow.config.jsonc` carries the
  // same set with the same reasons, so a finding one reports the other reports
  // too.
  ignoreDependencies: [
    // Depended on so that pnpm links its `conformetry` bin into
    // node_modules/.bin, which it does only for root dependencies. Nothing
    // imports it.
    "@conformetry/cli",
    "@commitlint/config-conventional", // commitlint preset, referenced as string in extends array
    "@golevelup/ts-vitest", // Conformance-scaffolded test mock utility — imported in testing/mocks.ts which is in ignoreFiles
    "@nx/eslint-plugin", // Loaded dynamically by Nx ESLint integration
    // Kept despite knip hinting it is redundant: the hint comes from a
    // full-workspace run, and the Nx target runs knip scoped to one workspace,
    // where nothing imports this.
    "@nx/js",
    "@nx/web", // Nx web plugin (auto-detected by Nx)
    // Declared at the root only so pnpm resolves @nestjs/core's optional peer
    // the same way for every workspace package; without it lexico-api and
    // lexico-entities load two copies of @nestjs/core and DI breaks.
    "@nestjs/platform-express",
    "@semantic-release/commit-analyzer", // semantic-release plugin, referenced in release.config.cjs
    "@semantic-release/github", // semantic-release plugin
    "@semantic-release/npm", // semantic-release plugin
    "@semantic-release/release-notes-generator", // semantic-release plugin
    "@semantic-release/changelog", // semantic-release plugin
    "@semantic-release/git", // semantic-release plugin
    "@swc/helpers", // SWC runtime helpers, required by @swc-node/register for compiled TS
    "commitlint-plugin-gitmoji", // commitlint plugin, referenced as string in plugins array
    "commitlint-plugin-tense", // commitlint plugin, referenced as string in plugins array
    "markdownlint-cli2", // Markdown linter CLI, invoked via nx:run-commands in project.json
    "jscpd", // Duplicate-code detection CLI, invoked via nx:run-commands in project.json
    "stylelint-config-standard", // stylelint preset, referenced as string in extends array
    "stylelint-config-tailwindcss", // stylelint preset, referenced as string in extends array
    "stylelint", // CSS linter CLI, invoked via nx:run-commands in project.json
    "tslib", // TypeScript helper library, implicit runtime dependency for compiled TS
    // Side-by-side TypeScript 7, aliased in the catalog. The `typecheck`
    // target invokes its `tsc` binary directly; nothing imports it, and
    // typescript-eslint and @swc-node/register still require TypeScript 6.
    "typescript-7",
    "squawk-cli", // SQL linter CLI, invoked via nx:run-commands in project.json
    // Runtime dependency of the inlined @codebase/logger utility
    "pino",
    // Reached only through a runtime transport string in Pino for development-mode pretty printing, so invisible to static import analysis
    "pino-pretty",
    // Dynamically loaded by vite-plugin-dts / unplugin-dts for declaration bundling via API Extractor
    "@microsoft/api-extractor",
  ],

  // Allow exports that are only used in the same file (common for barrel re-exports)
  ignoreExportsUsedInFile: true,

  // JimmyPaolini is a GitHub profile page with no buildable code — skip analysis
  ignoreWorkspaces: ["applications/JimmyPaolini", "applications/affirmations"],

  workspaces: {
    // Root workspace: scripts, base configs, and Nx configuration files
    ".": {
      entry: [
        "scripts/**/*.{js,mjs,ts,sh}",
        ".devcontainer/scripts/**/*.{js,mjs,ts,sh}",
        "configuration/vitest.config.ts",
        "configuration/commitlint.config.ts",
        "configuration/dependency-cruiser.cjs",
        "configuration/eslint.config.ts",
        "configuration/lint-staged.config.ts",
        "configuration/oxfmt.config.ts",
        "configuration/oxlint.config.ts",
        "configuration/fallow.config.jsonc", // fallow static analysis config
        "configuration/prettier.config.ts",
        "configuration/stylelint.config.cjs",
        "configuration/syncpack.config.cjs",
        "configuration/vite.library.config.ts",
        // Read by codometer's nearest-ancestor search rather than imported;
        // it re-exports configuration/codometer.config.ts from the workspace
        // root, which is the only place that search can reach.
        "codometer.config.ts",
        "configuration/release.config.cjs",
        "validate-branch-name.config.cjs",
      ],
      ignore: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/dist/**",
        "**/coverage/**",
        "applications/JimmyPaolini/**",
        "pnpm-workspace.yaml", // Catalog dependencies are shared across workspace; knip would flag all as unused in root
        "configuration/conformetry-templates/**", // Generator templates are placeholder files, not executable workspace code
        "packages/ic-suite/codometer/codometer-examples/examples/compiled/**", // Stand-in build output, committed so a target example has something to measure
        "packages/ic-suite/codometer/codometer-examples/examples/corpus/**", // Sample corpus written to be counted; uncalled and unimported by construction
        // Skill scripts are invoked by the skill framework, not imported in code
        "**/.agents/skills/**",
        "**/.claude/skills/**",
        ".claude/worktrees/**",
        "**/.github/skills/**",
      ],
      ignoreBinaries: [
        "view", // pnpm sub-command: `pnpm view pnpm version` in upgrade-dependencies workflow
      ],
      project: "**/*.{js,ts,mjs,cjs}",
    },

    // caelundas: Node.js CLI for astronomical calendar generation
    "applications/caelundas": {
      ignore: [
        "output/**", // Generated calendar output files
        "testing/**", // Test fixtures and setup
      ],
      project: "src/**/*.ts",
    },

    // lexico: TanStack Start SSR web application with Supabase backend.
    // The client entry and the generated route tree are named in
    // `vite.config.mts` rather than imported, so knip is told where they are;
    // both sit under `src/lib/` because `codebase-structure.json` restricts a
    // `src/` root to entry-point names.
    "applications/lexico": {
      entry: [
        "src/lib/client.tsx",
        "src/lib/routeTree.gen.ts",
        "src/router.tsx",
      ],
      ignore: [
        "src/lib/auth.ts", // Supabase auth utilities (used at runtime)
        "src/lib/bookmarks.ts", // Bookmark feature module (used at runtime)
      ],
      ignoreDependencies: [
        "vitest", // Used by tests and Vitest config; Knip may miss it when test sources are excluded
      ],
      project: "src/**/*.{ts,tsx}",
    },

    // lexico-api: NestJS GraphQL API
    "applications/lexico-api": {
      ignoreDependencies: [
        // Apollo 5's Express integration, which @nestjs/apollo resolves by
        // name at startup; without it GraphQLModule refuses to boot.
        "@as-integrations/express5",
        "typeorm", // Used by testing/mocks.ts for repository mocks
      ],
      project: "src/**/*.ts",
    },

    // codometer-examples: A sample corpus and one configuration per behavior.
    // Nothing here is imported by anything — the configurations are read by the
    // codometer command line and the corpus exists to be counted — so knip is
    // told where the entry points really are rather than left to conclude the
    // whole package is dead.
    "packages/ic-suite/codometer/codometer-examples": {
      entry: [
        "codometer.config.ts",
        "examples/**/*.config.ts",
        "testing/**/*.ts",
      ],
      ignore: [
        "examples/compiled/**", // Stand-in build output for the target examples
        "examples/corpus/**", // Sample corpus written to be counted; uncalled and unimported by construction
      ],
      ignoreDependencies: [
        "@swc-node/register", // Named as a string on the command line testing/codometer.ts spawns, never imported
      ],
      project: ["codometer.config.ts", "examples/**/*.ts", "testing/**/*.ts"],
    },

    // lexico-components: Shared React component library (shadcn/ui)
    "packages/lexico-components": {
      entry: ["src/components/**/*.tsx"],
      project: ["src/**/*.ts", "src/**/*.tsx"],
    },

    // lexico-entities: Shared TypeORM entities
    "packages/lexico-entities": {
      entry: [
        "src/index.ts",
        "scripts/**/*.ts",
        "src/modules/database/data-source.constants.ts",
        "src/modules/database/migrations/**/*.ts",
      ],
      ignore: [
        "src/modules/database/database.module.ts", // Conformance-generated module stub, not yet exported
        "src/modules/entities/entities.module.ts", // Conformance-generated module stub, not yet exported
      ],
      ignoreDependencies: [
        "@testcontainers/postgresql", // Used by integration helper in packages/lexico-entities/testing (outside knip project scope)
      ],
      project: ["src/**/*.ts", "scripts/**/*.ts"],
    },

    // lexico-ingestion: Data ingestion CLI for the Lexico database
    "applications/lexico-ingestion": {
      ignore: [
        "testing/**", // Test fixtures and setup
      ],
      ignoreDependencies: [
        "@nestjs/testing", // Used by command unit tests; tests are excluded from knip project scope
        "vitest", // Knip misses vitest usage because tests are ignored
      ],
      project: "src/**/*.ts",
    },

    // meanderaw: Greek meander (key/fret) SVG generator CLI
    "applications/meanderaw": {
      // The CLI, the REPL its own target runs, and the sweep's worker
      // thread — spawned by URL, so nothing imports it.
      entry: ["src/main.ts", "src/repl.ts", "src/worker.ts"],
      project: "src/**/*.ts",
    },

    // logger: Shared pino-backed NestJS LoggerService and LoggerModule
    "packages/logger": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },

    // synchronization: NestJS CLI tool for codebase config synchronization commands
    "tools/synchronization": {
      entry: ["src/main.ts", "src/files.ts"], // Main CLI entry + public file-list constant exports
      ignore: [
        "testing/**", // Test fixtures and setup
      ],
      project: "src/**/*.ts",
    },

    // validation: NestJS CLI tool for the repository's one-sided checks
    "tools/validation": {
      entry: ["src/main.ts", "src/repl.ts"], // Main CLI entry + the REPL its own target runs
      ignore: [
        "testing/**", // Test fixtures and setup
      ],
      project: "src/**/*.ts",
    },

    // callidescope packages: the call-stack linting CLI and the configuration
    // it reads.
    "packages/ic-suite/callidescope/callidescope-cli": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/callidescope/callidescope-configuration": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    // Every fixture exists to be traced, not imported. An orphan-root fixture
    // is *defined* by having no caller, and a resolution-table fixture is
    // reached only by the type checker — which is exactly the shape knip
    // reports as an unused file or an unused export. Declaring the whole of
    // `examples/` as entry points says that directly, and keeps knip doing the
    // one job that still applies here: telling this package when a dependency
    // it declares has stopped being used. Ignoring `examples/` instead would
    // leave every dependency looking unused, and `knip --fix` would delete
    // them.
    "packages/ic-suite/callidescope/callidescope-examples": {
      entry: [
        "callidescope.workspace.config.ts",
        "examples/**/*.ts",
        "src/**/*.ts",
        "testing/**/*.test.ts",
      ],
      // The integration test spawns the callidescope command line through this
      // loader rather than importing it, so nothing in the module graph names
      // it. Undeclared, `knip --fix` deletes it and the test stops running.
      ignoreDependencies: ["@swc-node/register"],
      project:
        "{callidescope.workspace.config.ts,examples/**/*.ts,src/**/*.ts,testing/**/*.ts}",
    },
    "packages/ic-suite/callidescope/callidescope-graph": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/callidescope/callidescope-nx": {
      // An Nx plugin is loaded by name, never imported: the plugin entry and
      // every executor Nx resolves from `executors.json` are all roots nothing
      // in this workspace references.
      entry: ["src/index.ts", "src/executors/*/executor.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/callidescope/callidescope-output": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    // codometer packages: the measurement CLI and the configuration it reads
    "packages/ic-suite/codometer/codometer-cli": {
      entry: ["src/main.ts", "src/repl.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/codometer/codometer-configuration": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },

    // codependix packages: the examples package, whose `examples/` directory
    // holds subjects to be graphed and the guides rendered from them, neither of
    // which anything imports.
    "packages/ic-suite/codependix/codependix-examples": {
      entry: ["testing/render-examples.ts", "testing/**/*.test.ts"],
      ignoreDependencies: [
        // Imported by the example NestJS containers under `examples/`, which are
        // input to be graphed rather than code knip's project scope covers.
        // Booting one needs both present in this package's own node_modules.
        "@nestjs/common",
        "reflect-metadata",
      ],
      project: "testing/**/*.ts",
    },

    // conformetry packages: NestJS service/command application scaffolds
    "packages/ic-suite/conformetry/conformetry-cli": {
      entry: ["src/main.ts", "src/repl.ts"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/conformetry/conformetry-core": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/conformetry/conformetry-configuration": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    // conformetry-examples: runnable examples of the toolchain. Example code
    // exists to be read and run, not imported, so every file here is an entry
    // point in its own right — without saying so, knip reports the whole
    // package as unused. The fixture trees are excluded because a template
    // file is not valid TypeScript until it has been rendered.
    "packages/ic-suite/conformetry/conformetry-examples": {
      entry: ["examples/*/conformetry.config.ts", "examples/*/*.ts"],
      ignore: ["examples/*/instances/**", "examples/*/templates/**"],
      project: "examples/**/*.ts",
    },
    "packages/ic-suite/conformetry/conformetry-generation": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/conformetry/conformetry-languages": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/conformetry/conformetry-nx": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "src/**/templates/**", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/conformetry/conformetry-output": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
    "packages/ic-suite/conformetry/conformetry-validation": {
      entry: ["src/index.ts"],
      ignore: ["src/**/*.test.ts", "testing/**"],
      project: "src/**/*.ts",
    },
  },
};

export default config;
