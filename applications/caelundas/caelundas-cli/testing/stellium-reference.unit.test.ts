import fs from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { AspectGraphService } from "../src/modules/aspects/aspect-graph.service";
import { CompoundPhaseService } from "../src/modules/aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../src/modules/aspects/progressive-compound-event.service";
import { orbByAspect } from "../src/modules/caelundas/caelundas.constants";
import { ProgressiveUtilitiesService } from "../src/modules/progressive/progressive-utilities.service";
import { StelliumService } from "../src/modules/stellium/stellium.service";

import type { AspectBodies } from "../src/modules/aspects/aspects.types";
import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type { Body } from "../src/modules/caelundas/caelundas.types";

/** An expected boundary (no `end`) or span, as a subscriber would read it. */
interface ReferenceStelliumEvent {
  end?: string;
  start: string;
  summary: string;
}

/**
 * Horizons longitudes around each stellium boundary, and the boundaries and
 * spans those positions imply under the 8° conjunction orb.
 */
interface StelliumLongitudeFixture {
  boundaries: ReferenceStelliumEvent[];
  longitudesByMinute: Record<string, Partial<Record<Body, number>>>;
  name: string;
  note: string;
  retrieved: string;
  source: { name: string; url: string };
  spans: Required<ReferenceStelliumEvent>[];
}

const MILLISECONDS_PER_MINUTE = 60_000;

/** Reads detected events the way the fixture writes them. */
function asReference(
  events: DetectedCalendarEvent[],
): ReferenceStelliumEvent[] {
  return sortReference(
    events.map((event) => ({
      ...(event.end.isSame(event.start) ? {} : { end: isoMinute(event.end) }),
      start: isoMinute(event.start),
      summary: event.summary,
    })),
  );
}

/** The boundary minutes: every listed minute with a listed minute either side. */
function boundaryMinutes(fixture: StelliumLongitudeFixture): moment.Moment[] {
  const listed = new Set(
    Object.keys(fixture.longitudesByMinute).map((minute) =>
      moment.utc(minute).valueOf(),
    ),
  );
  return [...listed]
    .filter(
      (time) =>
        listed.has(time - MILLISECONDS_PER_MINUTE) &&
        listed.has(time + MILLISECONDS_PER_MINUTE),
    )
    .toSorted((first, second) => first - second)
    .map((time) => moment.utc(time));
}

/** Formats a minute the way the fixture keys and reference times are written. */
function isoMinute(minute: moment.Moment): string {
  return minute.toISOString().replace(".000Z", "Z");
}

/** Reads one committed Horizons longitude fixture by name. */
function loadStelliumFixture(name: string): StelliumLongitudeFixture {
  const file = path.join(
    import.meta.dirname,
    "reference-longitudes",
    `${name}.json`,
  );
  return JSON.parse(fs.readFileSync(file, "utf8")) as StelliumLongitudeFixture;
}

/**
 * Conjunctions in the active-aspect registry at `minute`: a pair within orb
 * then and a minute later, since a leg leaves the registry on its last minute
 * in orb.
 */
function registryAt(
  fixture: StelliumLongitudeFixture,
  minute: moment.Moment,
): AspectBodies[] {
  const now = fixture.longitudesByMinute[isoMinute(minute)];
  const next =
    fixture.longitudesByMinute[isoMinute(minute.clone().add(1, "minute"))];
  if (!now || !next) throw new Error(`No longitudes around ${minute.format()}`);
  const bodies = Object.keys(now) as Body[];
  const withinOrb = (first: Body, second: Body): boolean =>
    [now, next].every(
      (longitudes) =>
        separation(
          longitudes[first] ?? Number.NaN,
          longitudes[second] ?? Number.NaN,
        ) <= orbByAspect.conjunct,
    );

  return bodies.flatMap((first, index) =>
    bodies
      .slice(index + 1)
      .filter((second) => withinOrb(first, second))
      .map((second): AspectBodies => ({
        aspect: "conjunct",
        bodies: [first, second],
      })),
  );
}

/** Angular distance between two ecliptic longitudes, from 0° to 180°. */
function separation(first: number, second: number): number {
  const difference = Math.abs(first - second) % 360;
  return difference > 180 ? 360 - difference : difference;
}

/** Orders reference events by start, then title, so two lists compare as sets. */
function sortReference(
  events: ReferenceStelliumEvent[],
): ReferenceStelliumEvent[] {
  return events.toSorted(
    (first, second) =>
      first.start.localeCompare(second.start) ||
      first.summary.localeCompare(second.summary),
  );
}

describe("stelliums against JPL Horizons positions", () => {
  let service: StelliumService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AspectGraphService,
        CompoundPhaseService,
        LoggerService,
        ProgressiveCompoundEventService,
        ProgressiveUtilitiesService,
        StelliumService,
      ],
    }).compile();
    service = await module.resolve(StelliumService);
  });

  /** Runs the stellium step at every boundary minute the fixture lists. */
  function detectBoundaries(
    fixture: StelliumLongitudeFixture,
  ): DetectedCalendarEvent[] {
    return boundaryMinutes(fixture).flatMap((minute) =>
      service.detect({
        currentAspectBodies: registryAt(fixture, minute),
        minute,
        previousAspectBodies: registryAt(
          fixture,
          minute.clone().subtract(1, "minute"),
        ),
      }),
    );
  }

  describe.each([
    "horizons-stellium-2025-12-19",
    "horizons-stellium-2026-01-15",
  ])("%s", (name) => {
    const fixture = loadStelliumFixture(name);

    it("reports every stellium boundary the positions imply", () => {
      expect(asReference(detectBoundaries(fixture))).toStrictEqual(
        sortReference(fixture.boundaries),
      );
    });

    it("spans each stellium from its forming to its dissolving", () => {
      expect(
        asReference(service.detectProgressive(detectBoundaries(fixture))),
      ).toStrictEqual(sortReference(fixture.spans));
    });
  });
});
