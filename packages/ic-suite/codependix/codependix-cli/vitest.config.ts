import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/**/*.constants.ts",
          "src/**/*.module.ts",
          "src/**/*.test.ts",
          "src/**/*.types.ts",
          "src/main.module.ts",
          "src/main.ts",
        ],
        include: ["src/**/*.ts"],
      },
      hookTimeout: 30_000,
      testTimeout: 30_000,
    },
  }),
);
