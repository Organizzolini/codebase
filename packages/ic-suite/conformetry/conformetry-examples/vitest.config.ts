import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        // This package ships runnable examples and the guides that read them.
        // Its TypeScript is either an example configuration a reader copies or
        // an example script a reader runs, and the test below runs each one as
        // a child process — the same way the guides say to — so nothing here is
        // imported as library source and there is no source to instrument.
        include: [],
      },
      // Every test runs the conformetry command as a child process, which
      // compiles the toolchain through SWC on the way in. That is seconds per
      // example rather than milliseconds, so the default five-second timeout
      // would fail on machine speed rather than on behavior.
      hookTimeout: 300_000,
      testTimeout: 300_000,
    },
  }),
);
