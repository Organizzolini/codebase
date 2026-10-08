import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  getTestContactLimit,
  getTrackCoordinates,
} from "../../../testing/eclipse-test.utilities";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { EclipseGeometryService } from "./eclipse-geometry.service";

/** Kilometers in one astronomical unit (IAU 2012). */
const KILOMETERS_PER_ASTRONOMICAL_UNIT = 149_597_870.7;

/** Earth's equatorial radius over a horizontal parallax, as a distance in AU. */
function distanceFromParallax(arcseconds: number): number {
  return distanceSubtending(6378.137, arcseconds);
}

/** Geocentric distance in AU at which `kilometers` subtends `arcseconds`. */
function distanceSubtending(kilometers: number, arcseconds: number): number {
  return (
    kilometers /
    Math.sin((arcseconds / 3600) * (Math.PI / 180)) /
    KILOMETERS_PER_ASTRONOMICAL_UNIT
  );
}

/** The Sun's radius over its semidiameter, as a distance in AU; NASA rounds its parallax to 0.1″. */
function sunDistanceFromSemidiameter(arcseconds: number): number {
  return distanceSubtending(695_700, arcseconds);
}

describe(EclipseGeometryService, () => {
  let service: EclipseGeometryService;

  const ephemerisService = {
    getAzimuthElevationFromEphemeris:
      vi.fn<EphemerisService["getAzimuthElevationFromEphemeris"]>(),
    getCoordinateFromEphemeris:
      vi.fn<EphemerisService["getCoordinateFromEphemeris"]>(),
    getDistanceFromEphemeris:
      vi.fn<EphemerisService["getDistanceFromEphemeris"]>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseGeometryService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: ephemerisService },
      ],
    }).compile();

    service = await module.resolve(EclipseGeometryService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("samples coordinates and distances around the current minute", () => {
    const minute = moment.utc("2024-04-08T18:00:00.000Z");
    const currentIso = minute.toISOString();
    const previousIso = minute.clone().subtract(1, "minute").toISOString();
    const offsetByIso = (minuteIso: string): number =>
      minuteIso === currentIso ? 0 : minuteIso === previousIso ? -1 : 1;
    const moonCoordinateEphemeris = {};
    const moonDistanceEphemeris = {};

    ephemerisService.getCoordinateFromEphemeris.mockImplementation(
      (ephemeris, minuteIso, field) =>
        (ephemeris === moonCoordinateEphemeris ? 200 : 20) +
        (field === "latitude" ? 0.5 : 0) +
        offsetByIso(minuteIso),
    );
    ephemerisService.getDistanceFromEphemeris.mockImplementation(
      (ephemeris, minuteIso) =>
        (ephemeris === moonDistanceEphemeris ? 0.0025 : 0.99) +
        offsetByIso(minuteIso) / 1000,
    );

    const result = service.getAllEclipseCoordinates({
      minute,
      moonCoordinateEphemeris,
      moonDistanceEphemeris,
      sunCoordinateEphemeris: {},
      sunDistanceEphemeris: {},
    });

    expect(result.currentCoordinates).toStrictEqual({
      distanceMoon: 0.0025,
      distanceSun: 0.99,
      latitudeMoon: 200.5,
      latitudeSun: 20.5,
      longitudeMoon: 200,
      longitudeSun: 20,
    });
    expect(result.previousCoordinates.longitudeMoon).toBe(199);
    expect(result.nextCoordinates.distanceSun).toBeCloseTo(0.991, 9);
  });

  it("samples the topocentric Sun and Moon around the current minute", () => {
    const minute = moment.utc("2026-08-12T17:54:00.000Z");
    const currentIso = minute.toISOString();
    const previousIso = minute.clone().subtract(1, "minute").toISOString();
    const moonAzimuthElevationEphemeris = {};
    const fieldValues = {
      azimuth: 200,
      eclipticLatitude: 0.4,
      eclipticLongitude: 140,
      elevation: 63,
      semidiameter: 0.25,
      trueElevation: -1,
    };

    ephemerisService.getAzimuthElevationFromEphemeris.mockImplementation(
      (ephemeris, minuteIso, field) =>
        fieldValues[field] +
        (ephemeris === moonAzimuthElevationEphemeris ? 0.01 : 0) +
        (minuteIso === currentIso ? 0 : minuteIso === previousIso ? -1 : 1),
    );

    const result = service.getAllTopocentricSamples({
      minute,
      moonAzimuthElevationEphemeris,
      sunAzimuthElevationEphemeris: {},
    });

    expect(result.current.sun).toStrictEqual({
      // True elevation −1° plus 34′ of refraction plus the 0.25° semidiameter.
      clearance: expect.closeTo(-1 + 34 / 60 + 0.25, 9) as number,
      latitude: 0.4,
      longitude: 140,
      semidiameter: 0.25,
    });
    expect(result.current.moon.longitude).toBeCloseTo(140.01, 9);
    expect(result.previous.sun.longitude).toBe(139);
    expect(result.next.moon.latitude).toBeCloseTo(1.41, 9);
  });

  describe("getTopocentricSolarContactGeometry", () => {
    /** One body seen from the ground, with its upper limb well above the horizon. */
    const disc = (
      longitude: number,
      latitude: number,
      semidiameter: number,
    ): {
      clearance: number;
      latitude: number;
      longitude: number;
      semidiameter: number;
    } => ({
      clearance: 30,
      latitude,
      longitude,
      semidiameter,
    });

    it("puts the limbs in contact at the sum of the topocentric semidiameters", () => {
      const { contactLimit } = service.getTopocentricSolarContactGeometry({
        moon: disc(100, 0, 0.27),
        sun: disc(100, 0, 0.26),
      });

      expect(contactLimit).toBeCloseTo(0.53, 9);
    });

    it("measures the great-circle separation of the topocentric Moon from the Sun", () => {
      const { separation } = service.getTopocentricSolarContactGeometry({
        moon: disc(100.3, 0.4, 0.27),
        sun: disc(100, 0, 0.26),
      });

      expect(separation).toBeCloseTo(0.5, 4);
    });
  });

  describe("getLunarContactGeometry", () => {
    it("matches NASA's penumbral radius for the 3 March 2026 eclipse", () => {
      // NASA LE2026Mar03T: Moon H.P. 57′18.7″, Sun S.D. 16′08.0″, P. Radius
      // 1.2361°, Moon S.D. 15′37.0″, so P1/P4 fall at 1.2361° + 0.2603°.
      const { contactLimit } = service.getLunarContactGeometry({
        distanceMoon: distanceFromParallax(57 * 60 + 18.7),
        distanceSun: sunDistanceFromSemidiameter(16 * 60 + 8),
        latitudeMoon: 0,
        latitudeSun: 0,
        longitudeMoon: 0,
        longitudeSun: 180,
      });

      expect(contactLimit).toBeCloseTo(1.2361 + (15 * 60 + 37) / 3600, 3);
    });

    it("measures the Moon's distance from the antisolar point", () => {
      const { separation } = service.getLunarContactGeometry(
        getTrackCoordinates({
          alongTrack: 0.3,
          crossTrack: 0.4,
          kind: "lunar",
        }),
      );

      expect(separation).toBeCloseTo(0.5, 3);
    });

    it("measures across 0° Aries and mirrors the Sun's latitude", () => {
      const { separation } = service.getLunarContactGeometry({
        distanceMoon: 0.0025,
        distanceSun: 0.99,
        latitudeMoon: -0.2,
        latitudeSun: 0.2,
        longitudeMoon: 0.1,
        longitudeSun: 179.9,
      });

      expect(separation).toBeCloseTo(0.2, 5);
    });

    it("uses the test track's independent contact limit", () => {
      expect(
        service.getLunarContactGeometry(
          getTrackCoordinates({ alongTrack: 0, crossTrack: 0, kind: "lunar" }),
        ).contactLimit,
      ).toBeCloseTo(getTestContactLimit("lunar"), 9);
    });
  });

  describe("getSolarContactGeometry", () => {
    it("matches NASA's global contact distance for 17 February 2026", () => {
      // NASA SE2026Feb17A: Moon H.P. 57′02.1″, Sun H.P. 8.9″, Sun S.D.
      // 16′11.1″, Moon S.D. 15′32.4″: π☾ − π☉ + s☉ + s☾.
      const { contactLimit } = service.getSolarContactGeometry({
        distanceMoon: distanceFromParallax(57 * 60 + 2.1),
        distanceSun: sunDistanceFromSemidiameter(16 * 60 + 11.1),
        latitudeMoon: 0,
        latitudeSun: 0,
        longitudeMoon: 0,
        longitudeSun: 0,
      });
      const expected =
        (57 * 60 + 2.1 - 8.9 + 16 * 60 + 11.1 + 15 * 60 + 32.4) / 3600;

      expect(contactLimit).toBeCloseTo(expected, 3);
    });

    it("measures the true Sun–Moon separation, latitude included", () => {
      const { separation } = service.getSolarContactGeometry(
        getTrackCoordinates({
          alongTrack: 0.3,
          crossTrack: 0.4,
          kind: "solar",
        }),
      );

      expect(separation).toBeCloseTo(0.5, 3);
    });

    it("uses the test track's independent contact limit", () => {
      expect(
        service.getSolarContactGeometry(
          getTrackCoordinates({ alongTrack: 0, crossTrack: 0, kind: "solar" }),
        ).contactLimit,
      ).toBeCloseTo(getTestContactLimit("solar"), 9);
    });
  });
});
