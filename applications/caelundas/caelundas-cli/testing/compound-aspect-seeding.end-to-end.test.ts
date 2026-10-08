import { describe, expect, it } from "vitest";

import { PIPELINE_TEST_TIMEOUT_MILLISECONDS } from "./pipeline-window.constants";
import { runPipelineWindow } from "./pipeline-window.functions";

import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type { PipelineWindow } from "./pipeline-window.types";

const philadelphia = { latitude: 39.949_309, longitude: -75.171_69 };

/** The Mars-Pluto T-squares window, shared with its reference fixture's sweep. */
const octoberWindow = {
  ...philadelphia,
  endDate: "2026-10-02",
  startDate: "2026-10-01",
};

/**
 * Mid-January 2026: Sun, Venus, Mars, Mercury, Vesta and Pluto, most of whose
 * conjunctions formed before the window opens, close into one stellium when
 * Mercury's conjunction with Pluto forms on the 17th.
 */
const januaryWindow = {
  ...philadelphia,
  endDate: "2026-01-17",
  startDate: "2026-01-15",
};

const januaryStelliumBodies = [
  "Mars",
  "Mercury",
  "Pluto",
  "Sun",
  "Venus",
  "Vesta",
];

/** The first minute a sweep covers: midnight local time on its start date. */
function firstMinute(window: PipelineWindow): number {
  return window.input.start.clone().startOf("day").valueOf();
}

/** Whether an event carries every one of the given categories. */
function hasCategories(
  event: DetectedCalendarEvent,
  categories: string[],
): boolean {
  return categories.every((category) => event.categories.includes(category));
}

describe(
  "compound aspects in effect at the window start",
  { timeout: PIPELINE_TEST_TIMEOUT_MILLISECONDS },
  () => {
    it("reports the compound aspects already in orb at the first minute", async () => {
      expect.hasAssertions();

      const swept = await runPipelineWindow(januaryWindow);
      const start = firstMinute(swept);
      const { perfective } = swept;
      const compoundsAtStart = perfective.filter(
        (event) =>
          event.start.valueOf() === start &&
          hasCategories(event, ["Compound Aspect", "Forming"]),
      );

      expect(compoundsAtStart.length).toBeGreaterThan(0);
    });

    it("reports the January stellium whose legs formed before the window", async () => {
      expect.hasAssertions();

      const { perfective } = await runPipelineWindow(januaryWindow);
      const lastLeg = perfective.find((event) =>
        hasCategories(event, [
          "Simple Aspect",
          "Conjunct",
          "Forming",
          "Mercury",
          "Pluto",
        ]),
      );
      const stellium = perfective.find(
        (event) =>
          hasCategories(event, ["Stellium", "Forming"]) &&
          januaryStelliumBodies.every((body) =>
            event.categories.includes(body),
          ),
      );

      expect(lastLeg).toBeDefined();
      expect(stellium?.start.toISOString()).toBe(lastLeg?.start.toISOString());
    });

    it.each([
      ["October 2026", octoberWindow],
      ["January 2026", januaryWindow],
    ])(
      "emits no simple-aspect event at the first minute of %s",
      async (_name, window) => {
        expect.hasAssertions();

        const swept = await runPipelineWindow(window);
        const start = firstMinute(swept);
        const { perfective } = swept;

        expect(
          perfective.filter(
            (event) =>
              event.start.valueOf() === start &&
              event.categories.includes("Simple Aspect"),
          ),
        ).toStrictEqual([]);
      },
    );
  },
);
