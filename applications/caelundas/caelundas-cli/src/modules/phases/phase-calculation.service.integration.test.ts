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
  IlluminationEphemeris,
} from "../ephemeris/ephemeris.types";
import type { PhaseParameters } from "./phases.types";

/** One minute of a synthetic planet and Sun, `index` minutes from the tested minute. */
interface SyntheticSample {
  illumination?: number;
  magnitude?: number;
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
  const illuminationEphemeris: IlluminationEphemeris = {};

  for (let index = -MARGIN_MINUTES; index <= MARGIN_MINUTES + 1; index++) {
    const timestamp = minute.clone().add(index, "minutes").toISOString();
    const {
      illumination,
      magnitude,
      planetLatitude,
      planetLongitude,
      sunLongitude,
    } = sample(index);
    planetCoordinateEphemeris[timestamp] = {
      latitude: planetLatitude ?? 0,
      longitude: planetLongitude,
    };
    sunCoordinateEphemeris[timestamp] = {
      latitude: 0,
      longitude: sunLongitude,
    };
    illuminationEphemeris[timestamp] = {
      illumination: illumination ?? 50,
      magnitude: magnitude ?? 0,
    };
  }

  return service.gatherPhaseParameters({
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

describe(PhaseCalculationService, () => {
  describe("east and west across 0° Aries", () => {
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

  describe("greatest elongation by angular separation", () => {
    const radians = Math.PI / 180;

    it("finds no greatest elongation where only the longitude gap peaks and the planet keeps climbing from the ecliptic", () => {
      // The longitude gap peaks at 20°, but the latitude grows 0.01° a minute, so the true separation keeps widening.
      const parameters = gatherParameters((index) => ({
        planetLatitude: 3 + 0.01 * index,
        planetLongitude: 120 + 0.001 * index - 0.000_01 * index ** 2,
        sunLongitude: 100 + 0.001 * index,
      }));

      expect(service.isElongation(parameters)).toBe(false);
      expect(service.isEasternElongation(parameters)).toBe(false);
    });

    it("finds the greatest elongation where the true separation peaks while the longitude gap still widens", () => {
      // The longitude gap widens 0.001° a minute; the latitude is set so the true separation is exactly 25° − 0.00001° × index².
      const parameters = gatherParameters((index) => {
        const longitudeGap = 20 + 0.001 * index;
        const separation = 25 - 0.000_01 * index ** 2;
        const latitude =
          Math.acos(
            Math.cos(separation * radians) / Math.cos(longitudeGap * radians),
          ) / radians;
        return {
          planetLatitude: latitude,
          planetLongitude: 100 + 0.001 * index + longitudeGap,
          sunLongitude: 100 + 0.001 * index,
        };
      });

      expect(service.isElongation(parameters)).toBe(true);
      expect(service.isEasternElongation(parameters)).toBe(true);
    });
  });

  describe("greatest brilliancy by apparent magnitude", () => {
    it("finds the brightest minute where the magnitude is least, though the illuminated fraction keeps growing", () => {
      const parameters = gatherParameters((index) => ({
        illumination: 25 + 0.01 * index,
        magnitude: -4.8 + 0.000_001 * index ** 2,
        planetLongitude: 140,
        sunLongitude: 100,
      }));

      expect(service.isBrightest(parameters)).toBe(true);
      expect(service.isEasternBrightest(parameters)).toBe(true);
      expect(service.isWesternBrightest(parameters)).toBe(false);
    });

    it("finds no brightest minute where only the illuminated fraction peaks and the magnitude keeps dimming", () => {
      const parameters = gatherParameters((index) => ({
        illumination: 25 - 0.0001 * index ** 2,
        magnitude: -4.8 + 0.0001 * index,
        planetLongitude: 60,
        sunLongitude: 100,
      }));

      expect(service.isBrightest(parameters)).toBe(false);
      expect(service.isWesternBrightest(parameters)).toBe(false);
    });
  });
});
