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
  "horizons-mercury-opposite-mars-2027-02-07",
  "horizons-mercury-opposite-mars-2027-02-16",
  "horizons-mercury-opposite-mars-2027-03-11",
  "horizons-mercury-venus-near-miss-2026-02-17",
  "usno-full-moon-2026-10-26",
  "usno-full-moon-opposition-2026-03-03",
  "usno-march-equinox-2026",
  "usno-philadelphia-moonset-2026-05-19",
  "usno-philadelphia-night-2026-03-19",
  "usno-philadelphia-rise-set-2026-03-20",
  "usno-philadelphia-twilight-2026-03-20",
  "usno-reykjavik-sun-2026-06-21",
  "usno-tromso-moon-2026-12-20",
  "usno-vigo-evening-twilight-2026-06-20",
  "horizons-venus-evening-set-2025-03-19",
  "horizons-mercury-western-elongation-2026-04-03",
  "horizons-mercury-eastern-elongation-2025-03-08",
  "horizons-mercury-eastern-elongation-2026-10-12",
  "horizons-venus-eastern-elongation-2026-08-15",
  "horizons-venus-greatest-brilliancy-2026-09-24",
  "horizons-venus-no-eastern-brilliancy-2026-10-20",
  "horizons-venus-no-western-brilliancy-2026-10-27",
  "horizons-mercury-no-brilliancy-2026-05-14",
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

  it(
    "emits no span that ends before it starts",
    { timeout: PIPELINE_TEST_TIMEOUT_MILLISECONDS },
    async () => {
      const { events } = await runPipelineWindow(fixture.window);
      const inverted = events.filter((event) =>
        event.end.isBefore(event.start),
      );

      expect(inverted.map((event) => event.summary)).toStrictEqual([]);
    },
  );
});
