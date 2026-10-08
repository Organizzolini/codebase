import baseConfig from "../../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          // @codebase/logging: bundled into the library build output via Vite and inlined,
          // so it is a build-time devDependency rather than a runtime dependency.
          // @golevelup/ts-vitest: a devDependency used only in test files, which
          // are outside the build dependency check's scope.
          // pino, pino-pretty: runtime dependencies of the inlined @codebase/logging,
          // not imported directly in this package's TypeScript source.
          // typescript: a peer of @callidescope/cli and @callidescope/graph,
          // declared here so a consumer installs it; nothing in this package
          // imports it.
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: [
            "@codebase/logging",
            "@golevelup/ts-vitest",
            "pino",
            "pino-pretty",
            "typescript",
            "vitest",
          ],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
