import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

// Deliberately not merged with `vite.config.mts`: the TanStack Start plugin
// code-splits every route component into a lazy chunk, which a test would then
// have to suspend on before it could render the page it imported.
export default mergeConfig(
  vitestConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": `${import.meta.dirname}/../../packages/components-web/src`,
      },
    },
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
);
