import { describe, expect, it } from "vitest";

import { PIPELINE_TEST_TIMEOUT_MILLISECONDS } from "./pipeline-window.constants";
import { runPipelineWindow } from "./pipeline-window.functions";

import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";

/**
 * Philadelphia, 8–10 October 2026. Ceres comes into opposition with the Lunar
 * Apogee on the 8th, and on the 10th the Moon squares both, completing a
 * T-square that was emitted twice at the minute it formed.
 */
const octoberWindow = {
  endDate: "2026-10-10",
  latitude: 39.949_309,
  longitude: -75.171_69,
  startDate: "2026-10-08",
};

const tSquareTitle = "Ceres, Lunar Apogee, Moon t-square";

/** Identifies a compound boundary by its minute, bodies, pattern, phase and focal body. */
function boundaryKey(event: DetectedCalendarEvent): string {
  return [event.start.toISOString(), ...event.categories.toSorted()].join("|");
}

/** Compound events that mark one minute rather than a span. */
function compoundBoundaries(
  events: DetectedCalendarEvent[],
): DetectedCalendarEvent[] {
  return events.filter(
    (event) =>
      event.categories.includes("Compound Aspect") &&
      event.end.isSame(event.start),
  );
}

/** Lower-cased category labels, since simple and compound events case body names differently. */
function lowerCategories(event: DetectedCalendarEvent): string[] {
  return event.categories.map((category) => category.toLowerCase());
}

describe(
  "compound aspects over a real window",
  { timeout: PIPELINE_TEST_TIMEOUT_MILLISECONDS },
  () => {
    it("emits each compound boundary once", async () => {
      expect.hasAssertions();

      const { events } = await runPipelineWindow(octoberWindow);
      const keys = compoundBoundaries(events).map((event) =>
        boundaryKey(event),
      );

      expect(keys.length).toBeGreaterThan(0);
      expect(
        keys.filter((key, index) => keys.indexOf(key) !== index),
      ).toStrictEqual([]);
    });

    it("emits one T-square occurrence as one boundary pair and one span", async () => {
      expect.hasAssertions();

      const { events } = await runPipelineWindow(octoberWindow);
      const tSquareEvents = events.filter((event) =>
        event.description.startsWith(tSquareTitle),
      );

      expect(
        tSquareEvents.map((event) => event.categories.includes("Forming")),
      ).toStrictEqual([true, false, false]);
      expect(tSquareEvents[0]?.start.toISOString()).toBe(
        "2026-10-10T06:45:00.000Z",
      );
    });

    it("dissolves each compound on the minute one of its legs dissolves", async () => {
      expect.hasAssertions();

      const { events } = await runPipelineWindow(octoberWindow);
      const legEndings = events.filter(
        (event) =>
          event.categories.includes("Simple Aspect") &&
          event.categories.includes("Dissolving"),
      );
      const compoundEndings = compoundBoundaries(events).filter((event) =>
        event.categories.includes("Dissolving"),
      );
      const unmatched = compoundEndings.filter((compound) => {
        const compoundCategories = lowerCategories(compound);
        return !legEndings.some((leg) => {
          // A simple aspect lists its two bodies fifth and sixth.
          const legBodies = lowerCategories(leg).slice(4, 6);
          return (
            leg.start.isSame(compound.start) &&
            legBodies.every((body) => compoundCategories.includes(body))
          );
        });
      });

      expect(compoundEndings.length).toBeGreaterThan(0);
      expect(
        unmatched.map(
          (event) => `${event.start.toISOString()} ${event.description}`,
        ),
      ).toStrictEqual([]);
    });

    it("titles compound spans without a phase or a missing symbol", async () => {
      expect.hasAssertions();

      const { events } = await runPipelineWindow(octoberWindow);
      const compoundTitles = events
        .filter((event) => event.categories.includes("Compound Aspect"))
        .map((event) => ({
          isSpan: !event.end.isSame(event.start),
          summary: event.summary,
        }));

      expect(compoundTitles.some(({ isSpan }) => isSpan)).toBe(true);
      expect(
        compoundTitles.filter(
          ({ isSpan, summary }) =>
            summary.includes("undefined") ||
            (isSpan && / (?:forming|dissolving)\b/u.test(summary)),
        ),
      ).toStrictEqual([]);
    });
  },
);
