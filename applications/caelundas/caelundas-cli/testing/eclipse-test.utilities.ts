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
 * Distance from the shadow axis inside which the whole Moon is in the umbra
 * (U2/U3) for the test distances: 1.01·π☾ + π☉ − s☉ − s☾.
 */
export function getTestTotalityLimit(): number {
  return (
    1.01 * subtend(6378.137, TEST_MOON_DISTANCE) +
    subtend(6378.137, TEST_SUN_DISTANCE) -
    subtend(695_700, TEST_SUN_DISTANCE) -
    subtend(1737.4, TEST_MOON_DISTANCE)
  );
}

/**
 * Coordinates with the Moon `alongTrack` degrees along, and `crossTrack`
 * degrees across, a track through the eclipse target: the antisolar point
 * for a lunar eclipse, the Sun for a solar one. The track runs east, tilted
 * north by `tilt` radians as a real Moon's does; the Sun sits on the ecliptic.
 */
export function getTrackCoordinates(args: {
  alongTrack: number;
  crossTrack: number;
  distanceMoon?: number;
  kind: "lunar" | "solar";
  tilt?: number;
}): EclipseCoordinates {
  const { alongTrack, crossTrack, tilt = 0 } = args;
  const targetLongitude =
    args.kind === "lunar" ? TEST_SUN_LONGITUDE + 180 : TEST_SUN_LONGITUDE;
  return {
    distanceMoon: args.distanceMoon ?? TEST_MOON_DISTANCE,
    distanceSun: TEST_SUN_DISTANCE,
    latitudeMoon: alongTrack * Math.sin(tilt) + crossTrack * Math.cos(tilt),
    latitudeSun: 0,
    longitudeMoon:
      targetLongitude +
      alongTrack * Math.cos(tilt) -
      crossTrack * Math.sin(tilt),
    longitudeSun: TEST_SUN_LONGITUDE,
  };
}

/**
 * Previous, current and next minute of a straight eclipse track, `minutes`
 * after the Moon's closest approach to the target at `crossTrack` degrees.
 */
export function getTrackWindow(args: {
  crossTrack: number;
  distanceMoon?: number;
  kind: "lunar" | "solar";
  minutes: number;
  tilt?: number;
}): {
  current: EclipseCoordinates;
  next: EclipseCoordinates;
  previous: EclipseCoordinates;
} {
  const at = (minutes: number): EclipseCoordinates =>
    getTrackCoordinates({
      ...args,
      alongTrack: minutes * TEST_TRACK_SPEED,
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
