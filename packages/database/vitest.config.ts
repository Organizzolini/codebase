import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        /**
         * Entities as well as tests, as lexico-entities excludes them: an
         * entity is decorators alone, whose only branches are the
         * `design:type` metadata the compiler emits for each column's type.
         * The integration suite exercises every column against a database.
         */
        exclude: ["src/**/*.entity.ts", "src/**/*.test.ts"],
        include: ["src/**/*.ts"],
      },
    },
  }),
);
