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
        /**
         * The testing entry's Nest helper too: it lives under `testing/`,
         * where code may import test tooling, but it is shipped code.
         */
        include: ["src/**/*.ts", "testing/database-testing.utilities.ts"],
      },
      /**
       * Two minutes per `beforeAll`, where the shared default is ten seconds:
       * the integration suite's one hook pulls and starts a Postgres
       * container and migrates it, which takes several seconds on a
       * developer's machine and several times that on a CI runner.
       */
      hookTimeout: 120_000,
      /** Two minutes per test too, for the containers some tests start themselves. */
      testTimeout: 120_000,
    },
  }),
);
