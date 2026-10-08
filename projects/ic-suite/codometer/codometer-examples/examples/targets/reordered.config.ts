import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * The same inputs with every `include` array written backwards.
 *
 * Negations form **one set applied to the whole input** rather than being read
 * in order, so putting the `!` first cannot change what the input holds. The
 * test beside these files measures both configurations and asserts the two
 * reports name the same files — which is the only way to state a property
 * about an ordering nobody can see.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../targets/reordered.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    {
      analyses: ["language", "size"],
      compression: "gzip",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
    {
      analyses: ["size"],
      // The negation first, the glob that adds files second.
      directory: "..",
      include: ["!compiled/**/vendor.js", "compiled/**/*.js"],
      name: "Compiled Without Vendor",
    },
    {
      analyses: ["language"],
      exclude: ["**/*.test.ts"],
      include: ["typescript/**/*.ts"],
      name: "Sources",
    },
    {
      analyses: ["size"],
      compression: "none",
      directory: "../..",
      include: ["project.json", "package.json"],
      name: "Manifests",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
