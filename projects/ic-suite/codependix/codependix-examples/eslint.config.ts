import baseConfig from "../../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🧪 Example subjects
  // Everything nested inside an example is the input being graphed rather than
  // code this repository authors: a `tsconfig.json` the compiler is meant to
  // refuse, a module that throws the moment it is imported, a self-referential
  // path alias, a `require` call, a re-export nothing consumes. Each is a
  // behavior an example exists to pin down, and each is something this
  // repository's own rules forbid — so linting them would either force them to
  // stop demonstrating what they demonstrate or bury them under suppression
  // comments, which is the one thing this repository never does.

  // The pattern is what draws the line: one level under `examples/` is the
  // rendered guide and its JSON exports, which stay in scope, and two levels
  // down is the subject, which does not. That is why the committed
  // `codependix-*graph.json` files keep inheriting the `jsonc/sort-array-values`
  // carve-out the workspace config declares for every graph codependix writes.
  {
    ignores: ["examples/*/*/**"],
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

  // 🚧 Nx Containment
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              // Only `@codependix/nx-projects` owns Nx. Everything another package
              // wants is already on `NxProject`, and a whole graph travels as
              // the opaque `NxProjectGraph` — reaching for `@nx/devkit` here
              // is how tag reading leaked into four packages before.
              message:
                "Import NxProject or NxProjectGraph from @codependix/nx-projects instead — only @codependix/nx-projects may depend on Nx.",
              name: "@nx/devkit",
            },
          ],
        },
      ],
    },
  },
];
