import baseConfig from "../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🚫 Project Ignores
  // Exclude large ingested data files
  {
    ignores: ["data/**"],
  },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          // @golevelup/ts-vitest: a devDependency, imported by the harnesses in
          // `testing/`, which the build dependency check counts as source
          // because they are not `*.test.ts` themselves.
          ignoredDependencies: ["@golevelup/ts-vitest", "pg", "vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
      "no-irregular-whitespace": "off",
    },
  },
];
