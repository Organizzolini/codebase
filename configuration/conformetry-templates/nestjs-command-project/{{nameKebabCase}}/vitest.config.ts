import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "{{workspaceRelativePrefix}}configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
      },
    },
  }),
);
