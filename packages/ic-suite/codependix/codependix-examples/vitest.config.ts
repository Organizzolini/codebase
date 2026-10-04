import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          // The bootstrap, like every other project's `src/main.ts`: it reads
          // `process.argv` and sets `process.exitCode`, and the run it delegates
          // to is covered directly.
          "testing/render-examples.ts",
        ],
        // Only the renderer is source. The tests beside it and the example
        // subjects under `examples/` are not, which is why neither is measured.
        include: ["testing/render/**/*.ts"],
      },
      // 🐢 These suites build real `ts.Program`s and boot real NestJS
      // containers, so they are not the sub-second work Vitest's 5s default
      // assumes. Each is well under a second on a warm workstation and an order
      // of magnitude slower on a shared CI runner competing with forty other Nx
      // tasks, which is what this headroom is for.
      testTimeout: 30_000,
    },
  }),
);
