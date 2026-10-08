import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../configuration/vitest.config.ts";

// Deliberately not merged with `vite.config.mts`: the TanStack Start plugin
// code-splits every route component into a lazy chunk, which a test would then
// have to suspend on before it could render the page it imported. Server
// function files are left out of coverage because `createServerFn` only runs
// inside the Start runtime; the logic they delegate to is tested in each
// module's `.utilities.ts`.
export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/**/*.test.ts",
          "src/**/*.test.tsx",
          "src/**/*.functions.ts",
          "src/client.tsx",
          "src/lib/**",
          "src/router.tsx",
          "src/routes/__root.tsx",
        ],
        include: ["src/**/*.ts", "src/**/*.tsx"],
      },
      environment: "jsdom",
    },
  }),
);
