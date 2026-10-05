import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import { EclipseGeometryService } from "./eclipse-geometry.service";

describe(EclipseGeometryService, () => {
  let service: EclipseGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseGeometryService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: EphemerisService,
          useValue: createMock<EphemerisService>(),
        },
        { provide: MathService, useValue: createMock<MathService>() },
      ],
    }).compile();

    service = await module.resolve(EclipseGeometryService);
  });

  const ephemerisService = {
    getAzimuthElevationFromEphemeris:
      vi.fn<EphemerisService["getAzimuthElevationFromEphemeris"]>(),
    getCoordinateFromEphemeris:
      vi.fn<EphemerisService["getCoordinateFromEphemeris"]>(),
    getDiameterFromEphemeris:
      vi.fn<EphemerisService["getDiameterFromEphemeris"]>(),
  };

  const mathService = {
    getAngle: vi.fn<MathService["getAngle"]>(
      (first: number, second: number) => first - second,
    ),
    isMaximum: vi.fn<MathService["isMaximum"]>(),
    isMinimum: vi.fn<MathService["isMinimum"]>(),
    normalizeDegrees: vi.fn<MathService["normalizeDegrees"]>(
      (value: number) => value,
    ),
  };

  const mockService = new EclipseGeometryService(
    new LoggerService(),
    ephemerisService as never,
    mathService as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("samples eclipse coordinates around the current minute", () => {
    const minute = moment.utc("2024-04-08T18:00:00.000Z");
    const currentIso = minute.toISOString();
    const previousIso = minute.clone().subtract(1, "minute").toISOString();
    const nextIso = minute.clone().add(1, "minute").toISOString();

    ephemerisService.getDiameterFromEphemeris.mockImplementation(
      (_ephemeris, minuteIso, property) => {
        if (minuteIso === currentIso && property === "currentDiameterMoon") {
          return 0.4;
        }
        if (minuteIso === currentIso && property === "currentDiameterSun") {
          return 0.5;
        }
        if (minuteIso === previousIso && property === "currentDiameterMoon") {
          return 0.3;
        }
        if (minuteIso === previousIso && property === "currentDiameterSun") {
          return 0.4;
        }
        if (minuteIso === nextIso && property === "currentDiameterMoon") {
          return 0.6;
        }
        if (minuteIso === nextIso && property === "currentDiameterSun") {
          return 0.7;
        }
        throw new Error(`unexpected diameter lookup ${minuteIso} ${property}`);
      },
    );
    ephemerisService.getCoordinateFromEphemeris.mockImplementation(
      (_ephemeris, minuteIso, coordinate) => {
        const baseValue =
          minuteIso === currentIso ? 100 : minuteIso === previousIso ? 90 : 110;
        if (coordinate === "latitude") {
          return baseValue / 10;
        }
        return baseValue;
      },
    );

    expect(
      mockService.getAllEclipseCoordinates({
        minute,
        moonCoordinateEphemeris: {},
        moonDiameterEphemeris: {},
        sunCoordinateEphemeris: {},
        sunDiameterEphemeris: {},
      }),
    ).toStrictEqual({
      currentCoordinates: {
        diameterMoon: 0.4,
        diameterSun: 0.5,
        latitudeMoon: 10,
        latitudeSun: 10,
        longitudeMoon: 100,
        longitudeSun: 100,
      },
      nextCoordinates: {
        diameterMoon: 0.6,
        diameterSun: 0.7,
        latitudeMoon: 11,
        latitudeSun: 11,
        longitudeMoon: 110,
        longitudeSun: 110,
      },
      previousCoordinates: {
        diameterMoon: 0.3,
        diameterSun: 0.4,
        latitudeMoon: 9,
        latitudeSun: 9,
        longitudeMoon: 90,
        longitudeSun: 90,
      },
    });
  });

  it("samples visibility and angles for eclipse detection", () => {
    const minute = moment.utc("2024-04-08T18:00:00.000Z");
    const currentIso = minute.toISOString();
    const previousIso = minute.clone().subtract(1, "minute").toISOString();

    ephemerisService.getAzimuthElevationFromEphemeris.mockImplementation(
      (_ephemeris, minuteIso) => {
        if (minuteIso === currentIso) {
          return 10;
        }
        if (minuteIso === previousIso) {
          return -5;
        }
        return 3;
      },
    );

    expect(
      mockService.getAllTopocentricVisibilities({
        minute,
        moonAzimuthElevationEphemeris: {},
        sunAzimuthElevationEphemeris: {},
      }),
    ).toStrictEqual({
      currentVisibility: {
        isLunarVisible: true,
        isSolarVisible: true,
      },
      nextVisibility: {
        isLunarVisible: true,
        isSolarVisible: true,
      },
      previousVisibility: {
        isLunarVisible: false,
        isSolarVisible: false,
      },
    });

    const currentCoordinates = {
      diameterMoon: 0.4,
      diameterSun: 0.5,
      latitudeMoon: 1,
      latitudeSun: 2,
      longitudeMoon: 100,
      longitudeSun: 90,
    };
    const previousCoordinates = {
      ...currentCoordinates,
      longitudeMoon: 95,
      longitudeSun: 85,
    };
    const nextCoordinates = {
      ...currentCoordinates,
      longitudeMoon: 105,
      longitudeSun: 95,
    };

    expect(
      mockService.getEclipseAngles(
        currentCoordinates,
        previousCoordinates,
        nextCoordinates,
      ),
    ).toStrictEqual({
      currentDiameter: 0.9,
      currentLatitudeAngle: -1,
      currentLongitudeAngle: 10,
      nextLongitudeAngle: 10,
      previousLongitudeAngle: 10,
    });
  });
});
