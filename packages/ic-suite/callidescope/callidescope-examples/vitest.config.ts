import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config.ts";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      /**
       * Every test here spawns the callidescope command line as a subprocess.
       *
       * That subprocess compiles the whole toolchain through
       * `@swc-node/register` before it traces anything, so a cold runner with
       * no swc cache spends far longer on the first run than the 10s vitest
       * allows a hook by default — which is how this suite passed locally and
       * timed out in CI. The trace itself is a second or two once warm.
       */
      hookTimeout: 120_000,
      testTimeout: 120_000,

      coverage: {
        /**
         * Nothing in this package is instrumented, and that is the point.
         *
         * Its source is fixture code: it exists to be *read* by the
         * type checker, not executed by a test. Every callable in it is shaped
         * to make one resolution rule, one finding, or one annotation visible,
         * and executing them would prove nothing about any of that — an
         * orphan-root fixture is defined by having no caller, so a test calling
         * it would destroy the example it is.
         *
         * What is verified instead is what callidescope *makes* of the
         * fixtures: `testing/findings.integration.test.ts` traces the package
         * and asserts every finding the guides document. That is the behavior
         * worth covering, and it is covered exactly.
         */
        include: [],
      },
    },
  }),
);
