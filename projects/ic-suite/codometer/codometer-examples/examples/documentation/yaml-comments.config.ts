import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How long a YAML comment block may run.
 *
 * The other half of comment length, configured apart from a JSDoc `comment`
 * selector and enabled on its own: this file's counter names
 * `language: "yaml"` and no `kind`, so not one JSDoc comment in the corpus is
 * measured.
 * Gating YAML prose is not a reason to start gating every doc comment against
 * the same number — see [codometer.config.ts](./codometer.config.ts) for the
 * `kind`-based counters.
 *
 * A **block** is the run of `#` lines a reader takes as one thought. A blank
 * line ends one, and a comment trailing a value is never part of the block
 * above it — it is read with that value, not with the prose. Comments come
 * from the tokenizer rather than the text, so a `#` inside a quoted scalar
 * stays a character in a string.
 *
 * The corpus holds exactly one block, the note above `pipeline.yaml`'s anchor,
 * and this selector declares two maxima for it: one line, and five words. The
 * two disagree — one line against a maximum of one holds, while twelve words
 * against a maximum of five breaches — which is why they are separate fields
 * rather than one `maximum` steered by a `unit`: a block can sit inside one
 * budget and outside another. Both maxima belong to **one counter**, though,
 * and a block that breaches either is one breach against that counter's
 * `limits[]` entry — the old report used to list the same block twice, once
 * per unit; the counter's own `instances` now lists it once, at whichever
 * measurement broke a maximum. Both numbers are far below anything a
 * repository would really write, so one short comment is enough to show the
 * check working.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../documentation/yaml-comments.config.ts --check limits
 * echo $?   # 1
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  custom: [
    {
      comment: { language: "yaml", maximumLines: 1, maximumWords: 5 },
      label: "YAML Comment Budget",
    },
  ],
  defaultInput: "codebase",
  format: "markdown",
  limits: [{ metric: "custom.YAML Comment Budget", value: 0 }],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
