import type { CodometerConfiguration } from "@codometer/configuration";

/**
 * `--check reports` compares a committed report against a fresh measurement.
 *
 * It is therefore only as stable as the numbers it re-measures — and one of
 * them is not stable across machines at all. Compressed sizes depend on the
 * zlib the runtime bundles, which differs between Node releases, so a report
 * written on one runtime and checked on another reads as **stale when nothing
 * changed**. Check on the runtime the repository pins, or expect a false
 * finding rather than a real one.
 *
 * The trap is worth reproducing rather than only warning about, because the
 * failure names a size that moved and looks exactly like a real regression.
 * The reproduction stands in for the runtime difference by editing the number
 * the other runtime would have produced:
 *
 * ```bash
 * cd copy
 * codometer --config ../../examples/staleness/codometer.config.ts --output-json
 * # Stand in for a different Node release's zlib.
 * jq '(.targets[].metrics[] | select(.path == "size") | .value) += 1' \
 *   codometer-report.json > patched.json
 * mv patched.json codometer-report.json
 * codometer --config ../../examples/staleness/codometer.config.ts --check reports
 * echo $?   # 1 — and nothing in the tree changed
 * ```
 *
 * The input is size-only on purpose: every other metric here is a count, and
 * counts do not move between runtimes. A repository that gates staleness on a
 * report carrying no size at all never meets this.
 */
const codometerConfiguration: CodometerConfiguration = {
  format: "markdown",
  inputs: [
    // Inside the measured directory on purpose, unlike the other size examples:
    // this one is run against a scratch copy of the corpus, and an input
    // reaching `..` from there would be pointed at whatever else the temporary
    // directory happens to hold.
    {
      analyses: ["size"],
      compression: "gzip",
      include: ["javascript/**/*.js"],
      name: "Scripts",
    },
  ],
  outputs: [{ indentation: 2, path: "codometer-report.json", type: "json" }],
  python: { command: "uv run python" },
};

export default codometerConfiguration;
