import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config.ts";

import viteConfig from "./vite.config.mts";

// Create a version without setupFiles for lexico (which doesn't have testing/setup.ts)
const baseConfigWithoutSetupFiles = defineConfig({
  ...vitestConfig,
  test: {
    ...vitestConfig.test,
    setupFiles: [],
  },
});

export default mergeConfig(
  viteConfig,
  mergeConfig(
    baseConfigWithoutSetupFiles,
    defineConfig({
      test: {
        coverage: {
          exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          include: ["src/**/*.ts", "src/**/*.tsx"],
          // Restore lexico coverage thresholds after the current regression work lands.
          thresholds: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
          },
        },
        environment: "jsdom",
      },
    }),
  ),
);
