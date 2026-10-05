import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import { TwilightsBuilderService } from "./twilights-builder.service";
import { TwilightsDetectorService } from "./twilights-detector.service";

import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";

describe(TwilightsDetectorService, () => {
  let service: TwilightsDetectorService;
  let ephemerisService: EphemerisService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TwilightsDetectorService,
        TwilightsBuilderService,
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(TwilightsDetectorService);
    await module.resolve(LoggerService);
    ephemerisService = await module.resolve(EphemerisService);

    vi.mocked(
      ephemerisService.getAzimuthElevationFromEphemeris,
    ).mockImplementation(
      (
        azimuthElevationEphemeris: AzimuthElevationEphemeris,
        minuteIsoString: string,
      ) => azimuthElevationEphemeris[minuteIsoString]?.elevation ?? 0,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("threshold predicates", () => {
    it("detects dawn threshold crossings", () => {
      expect(
        service.isDawn({
          currentElevation: -5,
          previousElevation: -7,
          twilight: "civil",
        }),
      ).toBe(true);

      expect(
        service.isDawn({
          currentElevation: -7,
          previousElevation: -5,
          twilight: "civil",
        }),
      ).toBe(false);
    });

    it("detects dusk threshold crossings", () => {
      expect(
        service.isDusk({
          currentElevation: -13,
          previousElevation: -11,
          twilight: "nautical",
        }),
      ).toBe(true);

      expect(
        service.isDusk({
          currentElevation: -11,
          previousElevation: -13,
          twilight: "nautical",
        }),
      ).toBe(false);
    });

    it("detects named dawn and dusk helpers", () => {
      expect(
        service.isAstronomicalDawn({
          currentElevation: -17,
          previousElevation: -19,
        }),
      ).toBe(true);
      expect(
        service.isNauticalDawn({
          currentElevation: -11,
          previousElevation: -13,
        }),
      ).toBe(true);
      expect(
        service.isCivilDawn({
          currentElevation: -5,
          previousElevation: -7,
        }),
      ).toBe(true);
      expect(
        service.isAstronomicalDusk({
          currentElevation: -19,
          previousElevation: -17,
        }),
      ).toBe(true);
      expect(
        service.isNauticalDusk({
          currentElevation: -13,
          previousElevation: -11,
        }),
      ).toBe(true);
      expect(
        service.isCivilDusk({
          currentElevation: -7,
          previousElevation: -5,
        }),
      ).toBe(true);
    });
  });

  describe("elevation extraction", () => {
    it("reads current and previous elevations", () => {
      const minute = moment.utc("2024-03-21T06:00:00.000Z");
      const previousMinute = minute.clone().subtract(1, "minute");
      const ephemeris: AzimuthElevationEphemeris = {
        [minute.toISOString()]: { azimuth: 86, elevation: -5.9 },
        [previousMinute.toISOString()]: { azimuth: 85, elevation: -6.1 },
      };

      const result = service.getSunElevations(ephemeris, minute);

      expect(result.currentElevation).toBe(-5.9);
      expect(result.previousElevation).toBe(-6.1);
    });
  });

  describe("transition event composition", () => {
    it("builds a civil dawn transition event", () => {
      const minute = moment.utc("2024-03-21T06:00:00.000Z");
      const events = service.buildTwilightTransitionEvents(
        {
          currentElevation: -5.9,
          previousElevation: -6.1,
        },
        minute,
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Civil Dawn");
    });

    it("builds multiple dawn transitions when elevation crosses all thresholds upward", () => {
      const minute = moment.utc("2024-03-21T06:00:00.000Z");
      const events = service.buildTwilightTransitionEvents(
        {
          currentElevation: -5,
          previousElevation: -19,
        },
        minute,
      );

      expect(events).toHaveLength(3);
      expect(events.map((event) => event.description)).toStrictEqual([
        "Astronomical Dawn",
        "Nautical Dawn",
        "Civil Dawn",
      ]);
    });

    it("builds multiple dusk transitions when elevation crosses all thresholds downward", () => {
      const minute = moment.utc("2024-03-21T18:00:00.000Z");
      const events = service.buildTwilightTransitionEvents(
        {
          currentElevation: -19,
          previousElevation: -5,
        },
        minute,
      );

      expect(events).toHaveLength(3);
      expect(events.map((event) => event.description)).toStrictEqual([
        "Civil Dusk",
        "Nautical Dusk",
        "Astronomical Dusk",
      ]);
    });

    it("returns no events when no threshold is crossed", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const events = service.buildTwilightTransitionEvents(
        {
          currentElevation: 45,
          previousElevation: 44,
        },
        minute,
      );

      expect(events).toHaveLength(0);
    });
  });
});
