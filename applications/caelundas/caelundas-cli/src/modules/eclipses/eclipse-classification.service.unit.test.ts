import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  getTrackCoordinates,
  getTrackWindow,
} from "../../../testing/eclipse-test.utilities";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { EclipseClassificationService } from "./eclipse-classification.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";

describe(EclipseClassificationService, () => {
  let service: EclipseClassificationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseClassificationService,
        EclipseGeometryService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
      ],
    }).compile();

    service = await module.resolve(EclipseClassificationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getLunarEclipseType", () => {
    // Test distances put the umbral contact (U1/U4) at 0.986° and the
    // internal one (U2/U3) at 0.454° from the shadow axis.
    it.each([
      [0.3, "total"],
      [0.7, "partial"],
      [1.2, "penumbral"],
      [1.6, null],
    ] as const)(
      "classifies a closest approach of %s° as %s",
      (crossTrack, expected) => {
        const { current, next, previous } = getTrackWindow({
          crossTrack,
          kind: "lunar",
          minutes: 0,
        });

        expect(service.getLunarEclipseType(current, previous, next)).toBe(
          expected,
        );
      },
    );

    it("knows the type at first contact, hours before greatest eclipse", () => {
      const { current, next, previous } = getTrackWindow({
        crossTrack: 0.3,
        kind: "lunar",
        minutes: -170,
        tilt: 0.1,
      });

      expect(service.getLunarEclipseType(current, previous, next)).toBe(
        "total",
      );
    });
  });

  describe("getSolarEclipseType", () => {
    // The umbra of the test geometry is about 369,800 km long, so a Moon
    // nearer than that is total at the path's ends, and one farther than
    // that plus Earth's radius is annular even at greatest eclipse.
    it.each([
      [0.0024, 0.1, "total"],
      [0.0026, 0.1, "annular"],
      [0.0025, 0.1, "hybrid"],
      [0.0025, 1, "partial"],
      [0.0025, 1.6, null],
    ] as const)(
      "classifies a Moon at %s AU passing %s° from the Sun as %s",
      (distanceMoon, crossTrack, expected) => {
        const { current, next, previous } = getTrackWindow({
          crossTrack,
          distanceMoon,
          kind: "solar",
          minutes: -120,
          tilt: 0.1,
        });

        expect(service.getSolarEclipseType(current, previous, next)).toBe(
          expected,
        );
      },
    );
  });

  describe("getSolarGamma", () => {
    it("is the shadow axis's distance from Earth's center in Earth radii", () => {
      // 1° from the Sun, the Moon's 373,994 km put the axis
      // 373,994 · sin 1° / (1 − d/D · cos 1°) / 6378.137 km away.
      const gamma = service.getSolarGamma(
        getTrackCoordinates({ alongTrack: 0, crossTrack: 1, kind: "solar" }),
      );
      const moonKilometers = 0.0025 * 149_597_870.7;
      const ratio = 0.0025 / 0.99;
      const expected =
        (moonKilometers * Math.sin(Math.PI / 180)) /
        Math.sqrt(1 + ratio ** 2 - 2 * ratio * Math.cos(Math.PI / 180)) /
        6378.137;

      expect(gamma).toBeCloseTo(expected, 6);
    });
  });
});
