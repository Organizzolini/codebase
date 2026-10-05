import baseConfig from "../../../configuration/eslint.config";

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
          // moment: a devDependency, imported by one unit test, which the
          // build dependency check does not read.
          // tsx: invoked as a string by the `download-ephemeris` target
          // (`pnpm tsx scripts/download-ephemeris.ts`), never imported.
          // vitest: a devDependency, imported by the harnesses in `testing/`,
          // which the build dependency check counts as source because they
          // are not `*.test.ts` themselves.
          ignoredDependencies: ["moment", "tsx", "vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
