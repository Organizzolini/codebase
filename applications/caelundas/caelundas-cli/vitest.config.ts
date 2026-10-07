import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        /**
         * Entities as well as tests: an entity is decorators alone, whose
         * only branches are the `emitDecoratorMetadata` fallbacks the
         * compiler adds, and no test can reach them.
         */
        exclude: ["src/**/*.entity.ts", "src/**/*.test.ts"],
        include: ["src/**/*.ts"],
      },
    },
  }),
);
