import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * A `write` that adds to the built-in badge rendering rather than replacing
 * it.
 *
 * `renderBadges()` is the default rendering of these same statistics, handed
 * to the writer so adding a line above them costs one template literal
 * instead of rewriting every badge group by hand. `render` and `write` used to
 * be two separate callbacks — one deciding what the markdown said, the other
 * deciding where it landed — and are now one: this `write` builds the content
 * itself and hands it to `anchors.syncAnchoredBlock`, which is the splice the
 * built-in writer would have done anyway.
 *
 * ```bash
 * cd packages/codometer-examples/examples/corpus
 * codometer --config ../output/custom-render.config.ts --output-markdown
 * ```
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  outputs: [
    {
      path: "statistics.md",
      type: "markdown",
      write: ({ anchors, renderBadges, statistics }) =>
        anchors.syncAnchoredBlock({
          content: [
            `**${statistics.sourceFiles} source files**, `,
            `${statistics.linesOfCode} lines of code.\n`,
            renderBadges(),
          ].join(""),
        }),
    },
  ],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
