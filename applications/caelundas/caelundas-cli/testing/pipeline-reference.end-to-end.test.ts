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
  "usno-march-equinox-2026",
  "usno-philadelphia-moonset-2026-05-19",
  "usno-philadelphia-rise-set-2026-03-20",
  "usno-philadelphia-twilight-2026-03-20",
  "usno-reykjavik-sun-2026-06-21",
  "usno-tromso-moon-2026-12-20",
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
