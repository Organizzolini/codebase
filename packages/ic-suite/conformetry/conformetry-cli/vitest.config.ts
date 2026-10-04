import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        // The integration test compiles the whole application graph, so every
        // workspace dependency is loaded from its own `src` rather than a
        // build. Each of those packages owns its own coverage; this allowlist
        // is what keeps them out. It is resolved against this project root, so
        // a pattern without `../` cannot reach a sibling package — do not
        // restate it as an exclude keyed on the package name, because
        // `conformetry-*` also matches `conformetry-cli` and silently drops
        // everything measured here.
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
      },
    },
  }),
);
