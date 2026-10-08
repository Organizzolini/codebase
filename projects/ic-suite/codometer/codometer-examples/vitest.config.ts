import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        // This package ships a sample corpus and the configurations that
        // measure it. Every line of TypeScript here is either a configuration
        // the tool reads or a test that runs it, so there is no source to
        // instrument and the coverage report is empty by nature rather than
        // by omission.
        include: [],
      },
      // Every test here spawns the codometer command line, and each spawn
      // compiles the tool through swc, bootstraps Nest, and reaches a Python
      // interpreter through uv — seconds of work on one core, repeated for
      // every run. The suites are split so the runner can hand them to
      // separate workers: on a runner whose other tasks have finished, those
      // cores are idle, and a single serial file left them that way.
      //
      // Hooks share the test budget because a `beforeAll` here is where one
      // run is spawned for several cases to read, and on a loaded runner a
      // single spawn can outlast the ten-second hook default.
      hookTimeout: 180_000,
      testTimeout: 180_000,
    },
  }),
);
