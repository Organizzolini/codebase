import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        // This package ships documentation. Its only TypeScript is the test
        // that checks the shipped skills, so there is no source to instrument
        // and the coverage report is empty by nature rather than by omission.
        include: [],
      },
    },
  }),
);
