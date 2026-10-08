import baseConfig from "../../../configuration/eslint.config";

export default [
  // �️ Base Config
  ...baseConfig,

  // 🙈 Ignores
  { ignores: ["src/modules/lexico-database/migrations/**"] },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          ignoredDependencies: ["typescript", "pg", "@nestjs/core"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
