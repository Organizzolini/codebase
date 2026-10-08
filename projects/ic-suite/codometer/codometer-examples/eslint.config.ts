import baseConfig from "../../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 📚 Sample Corpus
  // The corpus and the compiled output beside it are measured input rather than
  // authored source: their files exist so a counter has something to count, and
  // several are deliberately shaped the way this repository's own conventions
  // would not be — a static method, an uncalled export, three classes in one
  // bundle, a duplicated sample per language. Linting them would either force
  // the samples to stop demonstrating what they demonstrate or bury them under
  // suppression comments, which is the one thing this repository never does.
  // Scoped out here, once, rather than file by file.
  {
    ignores: ["examples/compiled/**", "examples/corpus/**"],
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
