import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How long a comment block may run, across every language that has comments.
 *
 * The old top-level `comments` block and the per-language `comments`
 * overrides it could carry are both gone. Every language now gets its own
 * `comment` selector, one custom statistic per language — there is no shared
 * default to override, so a "budget for every language except one looser
 * exception" is written out once per language rather than once for all of
 * them plus one override. Shell is loosened to eight words here while every
 * other language stays at three, the same distinction the old override made.
 *
 * A **block** is the run of comment lines a reader takes as one thought. A
 * blank line ends one, a comment trailing a value is never part of the block
 * above it, and a `#!` shebang is never a comment at all — without that last
 * rule every shell script opening with one would measure a block whose first
 * word is `!/usr/bin/env`.
 *
 * Python, YAML, CSS, and TypeScript/JavaScript's non-JSDoc comments are read by
 * a real parser or tokenizer — `tokenize` in the Python subprocess, the `yaml`
 * package's CST, postcss's own parse, the TypeScript compiler's scanner — so a
 * comment marker inside a string literal is never mistaken for a comment in
 * any of the four. Shell, TOML, SQL, and HCL are read by a line scanner (SQL
 * through the same patterns `SqlService` already strips comments with) that
 * cannot tell the two apart, exactly as those analyzers' own `comments`
 * counters already cannot.
 *
 * No `comment` selector here names `kind`, so not one JSDoc comment is
 * measured: JSDoc and a plain comment block are enabled separately even
 * though they share every field name and reach the report through one
 * channel — see [codometer.config.ts](./codometer.config.ts). The corpus's
 * TypeScript and JavaScript sources carry only JSDoc comments, so the
 * `typescript` counter here measures nothing at all — what is absent is as
 * informative as what breaches.
 *
 * A limit's value is a **count** of the blocks that broke a selector's own
 * maximum, so every limit below reads `value: 0`: no block may breach.
 *
 * Every counter is declared in the top-level `custom` array, which is what
 * measures it. This file declares no `outputs` entry at all — a gate does
 * not need a destination, since selecting a counter for some output and
 * measuring it are two separate questions now.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../documentation/comments.config.ts --check limits
 * echo $?   # 1
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  custom: [
    {
      comment: { language: "css", maximumWords: 3 },
      label: "CSS Comment Budget",
    },
    {
      comment: { language: "hcl", maximumWords: 3 },
      label: "HCL Comment Budget",
    },
    {
      comment: { language: "python", maximumWords: 3 },
      label: "Python Comment Budget",
    },
    // Loosened to eight words rather than held to the three every other
    // counter names. There is no shared budget to override any more, so
    // "every language at three except shell at eight" is eight independent
    // counters, and this is the one that reads differently.
    {
      comment: { language: "shell", maximumWords: 8 },
      label: "Shell Comment Budget",
    },
    {
      comment: { language: "sql", maximumWords: 3 },
      label: "SQL Comment Budget",
    },
    {
      comment: { language: "toml", maximumWords: 3 },
      label: "TOML Comment Budget",
    },
    {
      comment: { language: "typescript", maximumWords: 3 },
      label: "TypeScript Comment Budget",
    },
    {
      comment: { language: "yaml", maximumWords: 3 },
      label: "YAML Comment Budget",
    },
  ],
  defaultInput: "codebase",
  format: "markdown",
  limits: [
    { metric: "custom.CSS Comment Budget", value: 0 },
    { metric: "custom.HCL Comment Budget", value: 0 },
    { metric: "custom.Python Comment Budget", value: 0 },
    { metric: "custom.Shell Comment Budget", value: 0 },
    { metric: "custom.SQL Comment Budget", value: 0 },
    { metric: "custom.TOML Comment Budget", value: 0 },
    { metric: "custom.TypeScript Comment Budget", value: 0 },
    { metric: "custom.YAML Comment Budget", value: 0 },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
