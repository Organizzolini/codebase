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
          // @codependix/cli: the gate runs its `./main` export as a child
          // process, resolving the entry by a specifier string — no import
          // names it, so only `implicitDependencies` draws the edge.
          // @swc-node/register, @swc/core: the loader that child process
          // runs under, passed to `node --import` as a string, and its peer.
          // typescript: the loader's other peer, declared here so a consumer
          // installs it; nothing in this package imports it.
          // @golevelup/ts-vitest: a devDependency used only in test files, which
          // are outside the build dependency check's scope.
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: [
            "@codependix/cli",
            "@golevelup/ts-vitest",
            "@swc-node/register",
            "@swc/core",
            "typescript",
            "vitest",
          ],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
