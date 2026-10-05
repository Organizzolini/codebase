import baseConfig from "../../configuration/eslint.config";

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
          // @golevelup/ts-vitest: a devDependency used only in test files, which
          // are outside the build dependency check's scope.
          // eslint: imported only by src/lib/conventional-log-message.eslint-rule.ts,
          // which tsconfig.build.json excludes from the compiled package — it's
          // consumed as TypeScript source by ESLint configs, not by this
          // package's own runtime, so it stays a devDependency rather than a
          // real production dependency every consumer would inherit.
          // pino-pretty: named as a string transport target in LoggerService, so
          // no import proves the dependency is used.
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: [
            "@golevelup/ts-vitest",
            "eslint",
            "pino-pretty",
            "vitest",
          ],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
