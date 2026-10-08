import baseConfig from "../../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🚫 Project Ignores
  {
    ignores: ["src/lib/routeTree.gen.ts"],
  },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          ignoredFiles: [
            "{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}",
            "{projectRoot}/testing/**",
            "{projectRoot}/vite.config.{js,ts,mjs,mts}",
            "{projectRoot}/vitest.config.{js,ts,mjs,mts}",
          ],
        },
      ],
    },
  },
];
