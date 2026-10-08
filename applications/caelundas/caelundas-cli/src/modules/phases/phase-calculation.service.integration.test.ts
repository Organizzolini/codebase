import { createMock } from "@golevelup/ts-vitest";
import moment from "moment-timezone";
import { describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import { PhaseCalculationService } from "./phase-calculation.service";

import type {
  CoordinateEphemeris,
  DistanceEphemeris,
  IlluminationEphemeris,
} from "../ephemeris/ephemeris.types";
import type { PhaseParameters } from "./phases.types";

/** One minute of a synthetic planet and Sun, `index` minutes from the tested minute. */
interface SyntheticSample {
  planetLatitude?: number;
  planetLongitude: number;
  sunLongitude: number;
}

const minute = moment.utc("2026-04-03T22:34:00.000Z");

const service = new PhaseCalculationService(
  new LoggerService(),
  new EphemerisService(
    createMock(),
    createMock(),
    createMock(),
    createMock(),
    createMock(),
    createMock(),
  ),
  new MathService(),
);

/**
 * Samples a synthetic planet and Sun over the tested minute and its margins,
 * then gathers the phase parameters the detection services read.
 */
function gatherParameters(
  sample: (index: number) => SyntheticSample,
): PhaseParameters {
  const planetCoordinateEphemeris: CoordinateEphemeris = {};
  const sunCoordinateEphemeris: CoordinateEphemeris = {};
  const distanceEphemeris: DistanceEphemeris = {};
  const illuminationEphemeris: IlluminationEphemeris = {};

  for (let index = -MARGIN_MINUTES; index <= MARGIN_MINUTES + 1; index++) {
    const timestamp = minute.clone().add(index, "minutes").toISOString();
    const { planetLatitude, planetLongitude, sunLongitude } = sample(index);
    planetCoordinateEphemeris[timestamp] = {
      latitude: planetLatitude ?? 0,
      longitude: planetLongitude,
    };
    sunCoordinateEphemeris[timestamp] = {
      latitude: 0,
      longitude: sunLongitude,
    };
    distanceEphemeris[timestamp] = { distance: 1 };
    illuminationEphemeris[timestamp] = { illumination: 50 };
  }

  return service.gatherPhaseParameters({
    distanceEphemeris,
    illuminationEphemeris,
    minute,
    planetCoordinateEphemeris,
    sunCoordinateEphemeris,
  });
}

/** Wraps a longitude into [0, 360). */
function wrap(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

describe("phaseCalculationService east and west across 0° Aries", () => {
  it("calls a planet just past 0° Aries, east of a Sun in late Pisces, eastern and evening", () => {
    const parameters = gatherParameters(() => ({
      planetLongitude: 4,
      sunLongitude: 358,
    }));

    expect(service.isEastern(parameters)).toBe(true);
    expect(service.isEvening(parameters)).toBe(true);
    expect(service.isWestern(parameters)).toBe(false);
    expect(service.isMorning(parameters)).toBe(false);
  });

  it("calls a planet in late Pisces, west of a Sun past 0° Aries, western and morning", () => {
    const parameters = gatherParameters(() => ({
      planetLongitude: 345,
      sunLongitude: 13,
    }));

    expect(service.isWestern(parameters)).toBe(true);
    expect(service.isMorning(parameters)).toBe(true);
    expect(service.isEastern(parameters)).toBe(false);
    expect(service.isEvening(parameters)).toBe(false);
  });

  it("calls a set an evening set when the planet closes on the Sun from the east across 0° Aries", () => {
    // The gap is 6.051° a minute before and 6° now: it closes through the threshold.
    const parameters = gatherParameters((index) => ({
      planetLongitude: wrap(4 - 0.05 * index),
      sunLongitude: wrap(358 + 0.001 * index),
    }));

    expect(service.isEveningSet(parameters)).toBe(true);
    expect(service.isMorningSet(parameters)).toBe(false);
  });

  it("calls the greatest elongation of a planet in Pisces west of a Sun in Aries western", () => {
    // Mercury's 3 April 2026 western elongation: 27.8° west, the Sun near 13° Aries.
    const parameters = gatherParameters((index) => ({
      planetLongitude: wrap(
        13 + 0.001 * index - (27.8 - 0.000_01 * index ** 2),
      ),
      sunLongitude: 13 + 0.001 * index,
    }));

    expect(service.isWesternElongation(parameters)).toBe(true);
    expect(service.isEasternElongation(parameters)).toBe(false);
  });

  it("calls the greatest elongation of a planet in Aries east of a Sun in Pisces eastern", () => {
    // Mercury's 8 March 2025 eastern elongation: 18.2° east, the Sun near 348° Pisces.
    const parameters = gatherParameters((index) => ({
      planetLongitude: wrap(
        348 + 0.001 * index + (18.2 - 0.000_01 * index ** 2),
      ),
      sunLongitude: 348 + 0.001 * index,
    }));

    expect(service.isEasternElongation(parameters)).toBe(true);
    expect(service.isWesternElongation(parameters)).toBe(false);
  });
});
