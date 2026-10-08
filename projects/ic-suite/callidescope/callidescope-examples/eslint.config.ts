import baseConfig from "../../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🔭 The committed reports
  // Callidescope writes these and then reads them back, byte for byte, which is
  // what `--check reports` is. Their key order is the emitter's — a finding is
  // built by spreading the measurement it came from and stamping the `limit` it
  // was judged against on the end — so sorting them here makes the very next
  // `examples:write` put them back and `examples` report the file stale. The
  // same standoff `configuration/.oxfmtignore` already resolves for this exact
  // directory, and the same one `configuration/eslint.config.ts` resolves for
  // every graph codependix writes.
  {
    files: ["output/*.json"],
    rules: {
      "jsonc/sort-keys": "off",
    },
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
