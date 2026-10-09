import { describe, expect, it } from "vitest";

import { PIPELINE_TEST_TIMEOUT_MILLISECONDS } from "./pipeline-window.constants";
import { runPipelineWindow } from "./pipeline-window.functions";
import {
  assertReferenceEvents,
  loadReferenceFixture,
} from "./reference-fixtures.utilities";

/**
 * Whole-pipeline reference cases: each fixture names a window, an authority
 * and the events that authority publishes, and the real perfective and
 * progressive passes must reproduce them within the fixture's tolerance.
 *
 * To add a case, commit a fixture under `testing/reference-fixtures/`, then
 * add its name here: a failing case goes in first, the fix after it.
 */
const fixtureNames = [
  "horizons-chiron-jupiter-apogee-moon-kite-2026-10",
  "horizons-january-compound-aspects-2026-01",
  "horizons-mars-pluto-t-squares-2026-10",
  "nasa-lunar-eclipse-2026-03-03",
  "nasa-penumbral-lunar-eclipse-2027-02-20",
  "nasa-penumbral-lunar-eclipse-2027-08-17",
  "nasa-philadelphia-no-solar-eclipse-2027-02-06",
  "nasa-philadelphia-no-solar-eclipse-2027-08-02",
  "nasa-solar-eclipse-2026-02-17",
  "nasa-sydney-lunar-eclipse-2026-03-03",
  "horizons-mercury-opposite-mars-2027-02-07",
  "horizons-mercury-opposite-mars-2027-02-16",
  "horizons-mercury-opposite-mars-2027-03-11",
  "horizons-mercury-venus-near-miss-2026-02-17",
  "usno-full-moon-2026-10-26",
  "usno-full-moon-opposition-2026-03-03",
  "usno-march-equinox-2026",
  "usno-philadelphia-lunar-eclipse-2026-03-03",
  "usno-philadelphia-moonset-2026-05-19",
  "usno-philadelphia-no-solar-eclipse-2025-09-21",
  "usno-philadelphia-no-solar-eclipse-2026-02-17",
  "usno-philadelphia-rise-set-2026-03-20",
  "usno-philadelphia-solar-eclipse-2026-08-12",
  "usno-philadelphia-twilight-2026-03-20",
  "usno-reykjavik-sun-2026-06-21",
  "usno-tromso-moon-2026-12-20",
  "usno-vigo-evening-twilight-2026-06-20",
  "jpl-venus-libra-backward-ingress-2026-10-25",
  "jpl-saturn-pisces-backward-ingress-2025-09-01",
  "jpl-chiron-aries-backward-ingress-2026-09-18",
  "jpl-moon-aries-peak-ingress-2026-03-20",
  "usno-solar-aphelion-2026-07-06",
  "usno-solar-perihelion-2026-01-03",
];

describe.each(fixtureNames)("reference fixture %s", (name) => {
  const fixture = loadReferenceFixture(name);

  it(
    `agrees with ${fixture.source.name}`,
    { timeout: PIPELINE_TEST_TIMEOUT_MILLISECONDS },
    async () => {
      expect.hasAssertions();

      const { events } = await runPipelineWindow(fixture.window);

      assertReferenceEvents(events, fixture);
    },
  );
});
