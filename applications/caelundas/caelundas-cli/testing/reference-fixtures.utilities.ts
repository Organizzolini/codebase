import fs from "node:fs";
import path from "node:path";

import { expect } from "vitest";

import {
  MILLISECONDS_PER_MINUTE,
  REFERENCE_FIXTURES_DIRECTORY,
  referenceFixtureSchema,
} from "./reference-fixtures.constants";

import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type {
  ReferenceComparison,
  ReferenceEvent,
  ReferenceFixture,
} from "./reference-fixtures.types";

/**
 * Fails the test unless every reference event was paired with a detected
 * event within tolerance (one detected event satisfies at most one reference),
 * no `absent` summary was detected at all, and every `counts` summary occurs
 * exactly the stated number of times.
 *
 * The message lists every failing event with its expected time, actual time
 * and delta, and cites the fixture's source and retrieval date, so a failure
 * reads as a disagreement with a named authority rather than a bare number.
 */
export function assertReferenceEvents(
  events: readonly DetectedCalendarEvent[],
  fixture: ReferenceFixture,
): void {
  const failures = compareReferenceEvents(events, fixture)
    .filter((comparison) => !comparison.passed)
    .map((comparison) => describeFailure(comparison));
  const unexpected = (fixture.absent ?? []).flatMap((summary) =>
    events
      .filter((event) => event.summary === summary)
      .map(
        (event) =>
          `${summary}: must not be detected, found at ${event.start.toISOString()}`,
      ),
  );
  const miscounted = Object.entries(fixture.counts ?? {}).flatMap(
    ([summary, count]) => {
      const found = events.filter((event) => event.summary === summary);

      return found.length === count
        ? []
        : [
            `${summary}: expected exactly ${count} ${count === 1 ? "event" : "events"}, found ${found.length}${found.length > 0 ? ` (at ${found.map((event) => event.start.toISOString()).join(", ")})` : ""}`,
          ];
    },
  );
  const problems = [...failures, ...unexpected, ...miscounted];
  if (problems.length > 0) {
    expect.fail(
      [
        `${problems.length} of ${fixture.events.length + (fixture.absent?.length ?? 0) + Object.keys(fixture.counts ?? {}).length} reference checks failed for "${fixture.name}" (${fixture.source.name}, retrieved ${fixture.retrieved}):`,
        ...problems,
      ].join("\n"),
    );
  }

  // Counts as an assertion on the passing path, so `expect.hasAssertions()` holds.
  expect(problems).toHaveLength(0);
}

/**
 * Compares every reference event with the detected event of the same summary
 * paired to it by nearest start, within the event's tolerance (or the fixture's). A span reference
 * holds the end to the same tolerance as the start.
 */
export function compareReferenceEvents(
  events: readonly DetectedCalendarEvent[],
  fixture: ReferenceFixture,
): ReferenceComparison[] {
  const paired = pairEvents(events, fixture.events);

  return fixture.events.map((expected, index) => {
    const toleranceMinutes =
      expected.toleranceMinutes ?? fixture.toleranceMinutes;
    const actual = paired[index];
    if (!actual) {
      return { expected, passed: false, toleranceMinutes };
    }

    const startDeltaMinutes = minutesBetween(
      expected.start,
      actual.start.toDate(),
    );
    const endDeltaMinutes =
      expected.end === undefined
        ? undefined
        : minutesBetween(expected.end, actual.end.toDate());
    const passed =
      Math.abs(startDeltaMinutes) <= toleranceMinutes &&
      (endDeltaMinutes === undefined ||
        Math.abs(endDeltaMinutes) <= toleranceMinutes);

    return {
      actual,
      ...(endDeltaMinutes === undefined ? {} : { endDeltaMinutes }),
      expected,
      passed,
      startDeltaMinutes,
      toleranceMinutes,
    };
  });
}

/**
 * Reads and validates `<name>.json` from the reference fixtures directory.
 *
 * A fixture that names no source, no retrieval date or no tolerance, or that
 * gives a time that is not a UTC instant, is rejected: the point of a
 * reference is that someone can check it against its authority later.
 */
export function loadReferenceFixture(
  name: string,
  directory: string = REFERENCE_FIXTURES_DIRECTORY,
): ReferenceFixture {
  const contents = fs.readFileSync(
    path.join(directory, `${name}.json`),
    "utf8",
  );

  return referenceFixtureSchema.parse(JSON.parse(contents));
}

/** Renders one failed comparison as the lines a failing test prints. */
function describeFailure(comparison: ReferenceComparison): string {
  const { actual, endDeltaMinutes, expected, startDeltaMinutes } = comparison;
  const label = `${expected.summary}: expected ${formatInstant(expected.start)}`;
  if (!actual || startDeltaMinutes === undefined) {
    return `${label}, none detected`;
  }

  const tolerance = `(tolerance ±${comparison.toleranceMinutes} min)`;
  const parts = [
    `${label}, actual ${actual.start.toISOString()}, delta ${formatDelta(startDeltaMinutes)} min ${tolerance}`,
  ];
  if (expected.end !== undefined && endDeltaMinutes !== undefined) {
    parts.push(
      `  end expected ${formatInstant(expected.end)}, actual ${actual.end.toISOString()}, delta ${formatDelta(endDeltaMinutes)} min ${tolerance}`,
    );
  }

  return parts.join("\n");
}

/** Formats a signed number of minutes with one decimal, such as `+1.5`. */
function formatDelta(minutes: number): string {
  return `${minutes >= 0 ? "+" : "-"}${Math.abs(minutes).toFixed(1)}`;
}

/** Normalises a fixture instant to the ISO form detected events print in. */
function formatInstant(instant: string): string {
  return new Date(instant).toISOString();
}

/** Minutes from `reference` to `actual`: positive when the detected moment is later. */
function minutesBetween(reference: string, actual: Date): number {
  return (actual.getTime() - Date.parse(reference)) / MILLISECONDS_PER_MINUTE;
}

/**
 * Pairs each reference with a detected event of the same summary, nearest
 * start first, so that every detected event satisfies at most one reference.
 */
function pairEvents(
  events: readonly DetectedCalendarEvent[],
  references: readonly ReferenceEvent[],
): (DetectedCalendarEvent | undefined)[] {
  const candidates = references
    .flatMap((reference, referenceIndex) =>
      events
        .filter((event) => event.summary === reference.summary)
        .map((event) => ({
          distance: Math.abs(
            event.start.valueOf() - Date.parse(reference.start),
          ),
          event,
          referenceIndex,
        })),
    )
    .toSorted((a, b) => a.distance - b.distance);
  const paired: (DetectedCalendarEvent | undefined)[] = references.map(
    () => undefined,
  );
  const claimed = new Set<DetectedCalendarEvent>();
  for (const { event, referenceIndex } of candidates) {
    if (paired[referenceIndex] === undefined && !claimed.has(event)) {
      paired[referenceIndex] = event;
      claimed.add(event);
    }
  }

  return paired;
}
