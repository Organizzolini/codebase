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
          // @golevelup/ts-vitest: a devDependency used only in test files, which
          // are outside the build dependency check's scope.
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: ["@golevelup/ts-vitest", "vitest"],
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
