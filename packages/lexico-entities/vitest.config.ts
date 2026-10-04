import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/**/*.entity.ts",
          "src/**/testing/**/*.ts",
          "src/**/*.constants.ts",
          "src/**/*.types.ts",
          "src/**/*.module.ts",
          "src/**/migrations/**/*.ts",
          "src/**/InflectionDeclension.ts",
        ],
        include: ["src/**/!(*.test).ts"],
      },
      restoreMocks: true,
    },
  }),
);
