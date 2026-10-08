import baseConfig from "../../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🚫 Fixture Trees
  // A template file holds mustache where an identifier belongs, so it parses as
  // no language its extension names, and the instances beside it are drifted on
  // purpose. Declared here rather than in the shared configuration because a
  // flat config's ignore patterns are relative to the configuration file's own
  // directory, and this is the file that sits at this package's root.
  //
  // Each example's `conformetry.config.ts` and the embedding script sit outside
  // these two folders on purpose: they are the code a reader copies, so they
  // are linted and type-checked like any other source.
  {
    ignores: ["examples/*/instances/**", "examples/*/templates/**"],
  },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: ["vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
