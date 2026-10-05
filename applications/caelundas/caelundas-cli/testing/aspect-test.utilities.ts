import moment, { type Moment } from "moment-timezone";

import { bodies } from "../src/modules/caelundas/caelundas.constants";

import type { Body } from "../src/modules/caelundas/caelundas.types";
import type { Event } from "../src/modules/calendar/calendar.types";
import type { CoordinateEphemeris } from "../src/modules/ephemeris/ephemeris.types";

/**
 * Canonical minute fixture frequently used by aspect detection tests.
 */
export interface AspectMinuteFixture {
  currentMinute: Moment;
  minute: Moment;
  nextMinute: Moment;
  previousMinute: Moment;
}

/**
 * Previous/current/next longitude snapshots for one body.
 */
export interface BodyLongitudeFixture {
  currentLongitude: number;
  nextLongitude: number;
  previousLongitude: number;
}

/**
 * One-minute time window used by aspect detection tests.
 */
export interface MinuteWindow {
  currentMinute: Moment;
  nextMinute: Moment;
  previousMinute: Moment;
}

/**
 * Apply body-specific previous/current/next-minute longitude overrides.
 */
export function applyBodyLongitudeFixtureOverrides<TBody extends string>({
  bodies,
  coordinateEphemerisByBody,
  minuteWindow,
  overrides,
}: {
  bodies: readonly TBody[];
  coordinateEphemerisByBody: Record<TBody, CoordinateEphemeris>;
  minuteWindow: MinuteWindow;
  overrides: Partial<Record<TBody, BodyLongitudeFixture>>;
}): Record<TBody, CoordinateEphemeris> {
  const updatedCoordinateEphemerisByBody = { ...coordinateEphemerisByBody };

  for (const body of bodies) {
    const bodyLongitudeFixture = overrides[body];

    if (bodyLongitudeFixture === undefined) {
      continue;
    }

    updatedCoordinateEphemerisByBody[body] =
      createBodyLongitudeFixtureEphemeris({
        bodyLongitudeFixture,
        minuteWindow,
      });
  }

  return updatedCoordinateEphemerisByBody;
}

/**
 * Create per-body ephemeris for an explicit body set with optional overrides.
 */
export function createAspectEphemerisFixtureByBodies<TBody extends string>({
  bodies,
  defaultLongitude,
  minuteWindow,
  overrides = {},
}: {
  bodies: readonly TBody[];
  defaultLongitude: number;
  minuteWindow: MinuteWindow;
  overrides?: Partial<Record<TBody, BodyLongitudeFixture>>;
}): Record<TBody, CoordinateEphemeris> {
  const coordinateEphemerisByBody = createBodyCoordinateEphemeris({
    bodies,
    getLongitude: () => defaultLongitude,
    minuteWindow,
  }) as Record<TBody, CoordinateEphemeris>;

  return applyBodyLongitudeFixtureOverrides({
    bodies,
    coordinateEphemerisByBody,
    minuteWindow,
    overrides,
  });
}

/**
 * Create per-body ephemeris with deterministic indexed longitudes.
 */
export function createAspectEphemerisFixtureFromIndexedLongitudes<
  TBody extends string,
>({
  bodies,
  longitudeStart = 0,
  longitudeStep,
  minuteWindow,
}: {
  bodies: readonly TBody[];
  longitudeStart?: number;
  longitudeStep: number;
  minuteWindow: MinuteWindow;
}): Record<TBody, CoordinateEphemeris> {
  return createBodyCoordinateEphemeris({
    bodies,
    getLongitude: (_, index) => longitudeStart + index * longitudeStep,
    minuteWindow,
  });
}

/**
 * Create per-body ephemeris from an ordered longitude list.
 */
export function createAspectEphemerisFixtureFromOrderedLongitudes<
  TBody extends string,
>({
  bodies,
  fallbackLongitude = 0,
  longitudes,
  minuteWindow,
}: {
  bodies: readonly TBody[];
  fallbackLongitude?: number;
  longitudes: readonly number[];
  minuteWindow: MinuteWindow;
}): Record<TBody, CoordinateEphemeris> {
  return createBodyCoordinateEphemeris({
    bodies,
    getLongitude: (_, index) => longitudes[index] ?? fallbackLongitude,
    minuteWindow,
  });
}

/**
 * Create per-body previous/current/next minute ephemeris with optional per-body overrides.
 */
export function createAspectEphemerisForBodies({
  defaultLongitude = 100,
  minute,
  overrides = {},
}: {
  defaultLongitude?: number;
  minute: Moment;
  overrides?: Partial<
    Record<Body, { current: number; next: number; previous: number }>
  >;
}): Record<Body, CoordinateEphemeris> {
  const minuteWindow = {
    currentMinute: minute,
    nextMinute: minute.clone().add(1, "minute"),
    previousMinute: minute.clone().subtract(1, "minute"),
  };
  const coordinateEphemerisByBody: Partial<Record<Body, CoordinateEphemeris>> =
    {};

  for (const body of bodies) {
    const override = overrides[body];
    const current = override?.current ?? defaultLongitude;
    const next = override?.next ?? defaultLongitude;
    const previous = override?.previous ?? defaultLongitude;

    coordinateEphemerisByBody[body] = createCoordinateEphemerisFromLongitudes({
      [minuteWindow.currentMinute.toISOString()]: current,
      [minuteWindow.nextMinute.toISOString()]: next,
      [minuteWindow.previousMinute.toISOString()]: previous,
    });
  }

  if (!isCompleteCoordinateEphemerisByBody(coordinateEphemerisByBody)) {
    throw new Error("Expected ephemeris for every body");
  }

  return coordinateEphemerisByBody;
}

/**
 * Create minute fixture with both `minute` and `currentMinute` aliases.
 */
export function createAspectMinuteFixture(
  timestamp = "2024-03-21T12:00:00.000Z",
): AspectMinuteFixture {
  const minuteWindow = createMinuteWindow(timestamp);

  return {
    currentMinute: minuteWindow.currentMinute,
    minute: minuteWindow.currentMinute,
    nextMinute: minuteWindow.nextMinute,
    previousMinute: minuteWindow.previousMinute,
  };
}

/**
 * Create per-body ephemeris with deterministic longitudes for a minute window.
 */
export function createBodyCoordinateEphemeris({
  bodies,
  getLongitude,
  minuteWindow,
}: {
  bodies: readonly string[];
  getLongitude: (body: string, index: number) => number;
  minuteWindow: MinuteWindow;
}): Record<string, CoordinateEphemeris> {
  const coordinateEphemerisByBody: Record<string, CoordinateEphemeris> = {};

  bodies.forEach((body, index) => {
    coordinateEphemerisByBody[body] = createConstantCoordinateEphemeris(
      minuteWindow,
      getLongitude(body, index),
    );
  });

  return coordinateEphemerisByBody;
}

/**
 * Create one body's previous/current/next-minute ephemeris snapshot.
 */
export function createBodyLongitudeFixtureEphemeris({
  bodyLongitudeFixture,
  minuteWindow,
}: {
  bodyLongitudeFixture: BodyLongitudeFixture;
  minuteWindow: MinuteWindow;
}): CoordinateEphemeris {
  return createCoordinateEphemerisFromLongitudes({
    [minuteWindow.currentMinute.toISOString()]:
      bodyLongitudeFixture.currentLongitude,
    [minuteWindow.nextMinute.toISOString()]: bodyLongitudeFixture.nextLongitude,
    [minuteWindow.previousMinute.toISOString()]:
      bodyLongitudeFixture.previousLongitude,
  });
}

/**
 * Create constant coordinates for previous/current/next minute snapshots.
 */
export function createConstantCoordinateEphemeris(
  minuteWindow: MinuteWindow,
  longitude: number,
): CoordinateEphemeris {
  return createCoordinateEphemerisFromLongitudes({
    [minuteWindow.currentMinute.toISOString()]: longitude,
    [minuteWindow.nextMinute.toISOString()]: longitude,
    [minuteWindow.previousMinute.toISOString()]: longitude,
  });
}

/**
 * Build ephemeris records from ISO timestamp to longitude mappings.
 */
export function createCoordinateEphemerisFromLongitudes(
  longitudesByTimestamp: Record<string, number>,
): CoordinateEphemeris {
  return Object.fromEntries(
    Object.entries(longitudesByTimestamp).map(([timestamp, longitude]) => [
      timestamp,
      { latitude: 0, longitude },
    ]),
  );
}

/**
 * Create a canonical previous/current/next minute window for tests.
 */
export function createMinuteWindow(
  timestamp = "2024-03-21T12:00:00.000Z",
): MinuteWindow {
  const currentMinute = moment.utc(timestamp);
  const previousMinute = currentMinute.clone().subtract(1, "minute");
  const nextMinute = currentMinute.clone().add(1, "minute");

  return {
    currentMinute,
    nextMinute,
    previousMinute,
  };
}

/**
 * Create a progressive aspect event fixture for detectProgressive unit tests.
 */
export function createProgressiveAspectEvent({
  aspect,
  aspectCategory,
  body1,
  body2,
  phase,
  timestamp,
}: {
  aspect: string;
  aspectCategory: "Minor Aspect" | "Specialty Aspect";
  body1: string;
  body2: string;
  phase: "Dissolving" | "Forming" | "Perfective";
  timestamp: Moment;
}): Event {
  return {
    categories: [
      "Astronomy",
      "Astrology",
      aspectCategory,
      body1,
      body2,
      aspect,
      phase,
    ],
    description: `${body1} ${phase.toLowerCase()} ${aspect.toLowerCase()} ${body2}`,
    end: timestamp,
    start: timestamp,
    summary: `${phase} ${body1} ${aspect} ${body2}`,
  };
}

/**
 * Determine whether every canonical body has an ephemeris entry.
 */
function isCompleteCoordinateEphemerisByBody(
  coordinateEphemerisByBody: Partial<Record<Body, CoordinateEphemeris>>,
): coordinateEphemerisByBody is Record<Body, CoordinateEphemeris> {
  return bodies.every((body) => coordinateEphemerisByBody[body] !== undefined);
}
