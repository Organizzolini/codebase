import baseConfig from "../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🙈 Draw Run Output
  // The draw run's index and family pages — gitignored, and gigabytes at the
  // default edge budget, past the 2 GiB a single file read can hold. The base
  // config's root-relative ignore cannot match them here, since this config
  // resolves its globs from the project directory.
  { ignores: ["output/**"] },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          // pg: TypeORM's postgres driver, which TypeORM resolves by name at
          // runtime, so nothing imports it — the same carve-out lexico-entities
          // and lexico-ingestion make, and fallow's `ignoreDependencies` notes.
          // vitest: a devDependency, imported by the harnesses in `testing/`,
          // which the build dependency check counts as source because they
          // are not `*.test.ts` themselves.
          ignoredDependencies: ["pg", "vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
