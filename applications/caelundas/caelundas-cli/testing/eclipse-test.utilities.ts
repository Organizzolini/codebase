import {
  TEST_DEGREES_PER_RADIAN,
  TEST_KILOMETERS_PER_ASTRONOMICAL_UNIT,
  TEST_MOON_DISTANCE,
  TEST_SUN_DISTANCE,
  TEST_SUN_LONGITUDE,
  TEST_TRACK_SPEED,
} from "./eclipse-test.constants";

import type { EclipseCoordinates } from "../src/modules/eclipses/eclipses.types";

/**
 * Separation at P1/P4 for the test distances, worked out independently of
 * the service: the penumbral radius 1.01·π☾ + π☉ + s☉ plus s☾ for a lunar
 * eclipse, π☾ − π☉ + s☉ + s☾ for a solar one.
 */
export function getTestContactLimit(kind: "lunar" | "solar"): number {
  const moonParallax = subtend(6378.137, TEST_MOON_DISTANCE);
  const sunParallax = subtend(6378.137, TEST_SUN_DISTANCE);
  const moonSemidiameter = subtend(1737.4, TEST_MOON_DISTANCE);
  const sunSemidiameter = subtend(695_700, TEST_SUN_DISTANCE);
  return kind === "lunar"
    ? 1.01 * moonParallax + sunParallax + sunSemidiameter + moonSemidiameter
    : moonParallax - sunParallax + sunSemidiameter + moonSemidiameter;
}

/**
 * Coordinates with the Moon `alongTrack` degrees east of, and `crossTrack`
 * degrees north of, the eclipse target: the antisolar point for a lunar
 * eclipse, the Sun for a solar one. The Sun sits on the ecliptic.
 */
export function getTrackCoordinates(args: {
  alongTrack: number;
  crossTrack: number;
  kind: "lunar" | "solar";
}): EclipseCoordinates {
  const targetLongitude =
    args.kind === "lunar" ? TEST_SUN_LONGITUDE + 180 : TEST_SUN_LONGITUDE;
  return {
    distanceMoon: TEST_MOON_DISTANCE,
    distanceSun: TEST_SUN_DISTANCE,
    latitudeMoon: args.crossTrack,
    latitudeSun: 0,
    longitudeMoon: targetLongitude + args.alongTrack,
    longitudeSun: TEST_SUN_LONGITUDE,
  };
}

/**
 * Previous, current and next minute of a straight eclipse track, `minutes`
 * after the Moon's closest approach to the target at `crossTrack` degrees.
 */
export function getTrackWindow(args: {
  crossTrack: number;
  kind: "lunar" | "solar";
  minutes: number;
}): {
  current: EclipseCoordinates;
  next: EclipseCoordinates;
  previous: EclipseCoordinates;
} {
  const at = (minutes: number): EclipseCoordinates =>
    getTrackCoordinates({
      alongTrack: minutes * TEST_TRACK_SPEED,
      crossTrack: args.crossTrack,
      kind: args.kind,
    });
  return {
    current: at(args.minutes),
    next: at(args.minutes + 1),
    previous: at(args.minutes - 1),
  };
}

/** Angle subtended by `kilometers` at `distance` AU, degrees. */
function subtend(kilometers: number, distance: number): number {
  return (
    Math.asin(kilometers / (distance * TEST_KILOMETERS_PER_ASTRONOMICAL_UNIT)) *
    TEST_DEGREES_PER_RADIAN
  );
}
