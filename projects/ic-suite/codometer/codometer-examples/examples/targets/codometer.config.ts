import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * Every field an input carries, over files the codebase input cannot see.
 *
 * The two compiled samples sit in `examples/compiled/`, beside the corpus rather
 * than inside it — which is where build output really lives, and why the
 * inputs naming them carry a `directory` hop. The codebase input measures 28
 * files and none of them are those two, because it measures one directory and
 * they are not in it.
 *
 * The other half of the same story is `examples/corpus/.gitignore`, which names
 * `generated/`. Copy the compiled samples in there and the codebase input
 * still reports 28: discovery reads that ignore file itself. An input's globs
 * are the one place ignore rules do not reach, which is what lets a repository
 * gate the size of a build directory every `.gitignore` claims.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../targets/codometer.config.ts
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    // 📦 Both analyses over the compiled output. Two files.
    {
      analyses: ["language", "size"],
      compression: "gzip",
      directory: "..",
      include: ["compiled/**/*.js"],
      name: "Compiled",
    },
    // ✂️ The same globs with a `!` negation. One file.
    {
      analyses: ["size"],
      directory: "..",
      include: ["compiled/**/*.js", "!compiled/**/vendor.js"],
      name: "Compiled Without Vendor",
    },
    // 🚫 `exclude` removes as `!` does, written as its own field. Seven of the
    // fifteen TypeScript files are tests, leaving eight.
    {
      analyses: ["language"],
      exclude: ["**/*.test.ts"],
      include: ["typescript/**/*.ts"],
      name: "Sources",
    },
    // 🧭 `directory` starts the globs somewhere else, relative to the process's
    // working directory. This one reaches up out of the corpus into the
    // package.
    {
      analyses: ["size"],
      compression: "none",
      directory: "../..",
      include: ["package.json", "project.json"],
      name: "Manifests",
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
