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
          // @codebase/logging: bundled directly into the emitted library bundle by Vite,
          // so it is a build-time devDependency rather than a runtime dependency.
          // @golevelup/ts-vitest: a devDependency used only in test files, which
          // are outside the build dependency check's scope.
          // pino: runtime dependency of the inlined logger utility.
          // pino-pretty: pretty-printing transport reached only through a runtime
          // string in LoggerService, so invisible to static analysis.
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: [
            "@codebase/logging",
            "@golevelup/ts-vitest",
            "ignore",
            "pino",
            "pino-pretty",
            "vitest",
          ],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
