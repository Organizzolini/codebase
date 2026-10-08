import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * How long a documented declaration's comment may run.
 *
 * The old top-level `documentation` block, and the `kinds` it carried, are
 * gone. A comment budget is now one of the three things a custom statistic's
 * counter can select — alongside `patterns` and `symbols` — via
 * `comment: { kind, ... }`, which asks for a JSDoc-style comment on
 * declarations of that kind rather than a plain comment block. Where one
 * repository-wide number used to have `kinds` carve out room per declaration
 * kind, each kind is now its own counter with its own `maximumLines`.
 *
 * A comment-budget breach is gated the same way any other counter is — an
 * ordinary `limits[]` entry addressing its `custom.<label>` metric path — and
 * its **value is a count of the blocks that broke the selector's own
 * maximum**, not a line count itself: a limit of `0` means "no block may
 * breach", which is what every comment budget in this repository's own shared
 * configuration is written as.
 *
 * The corpus breaches on exactly two of its declarations under these budgets:
 * `CatalogService`, whose eight-line class overview is longer than 4, and
 * `Receipt.blank`, whose seven-line method note is longer than 2. Each
 * breaching declaration is named in the metric's own `instances`, with its
 * file, line, and measured length — a declaration that holds is not listed by
 * name, only counted.
 *
 * What is **not** here is as informative: a module-level `const`, including one
 * holding an arrow function, is not a documentable declaration and is never
 * measured — so `priceLine` and `DEFAULT_CURRENCY` breach nothing whatever
 * comments they carry.
 *
 * Every counter is declared in the top-level `custom` array, which is what
 * measures it; no `outputs` entry is needed just to gate a limit.
 *
 * ```bash
 * cd projects/ic-suite/codometer/codometer-examples/examples/corpus
 * codometer --config ../documentation/codometer.config.ts --check limits
 * echo $?   # 1
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  custom: [
    {
      comment: { kind: "class", maximumLines: 4 },
      label: "Class Comment Budget",
    },
    {
      comment: { kind: "interface", maximumLines: 3 },
      label: "Interface Comment Budget",
    },
    {
      comment: { kind: "method", maximumLines: 2 },
      label: "Method Comment Budget",
    },
    {
      comment: { kind: "property", maximumLines: 2 },
      label: "Property Comment Budget",
    },
  ],
  defaultInput: "codebase",
  format: "markdown",
  limits: [
    { metric: "custom.Class Comment Budget", value: 0 },
    { metric: "custom.Interface Comment Budget", value: 0 },
    { metric: "custom.Method Comment Budget", value: 0 },
    { metric: "custom.Property Comment Budget", value: 0 },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
