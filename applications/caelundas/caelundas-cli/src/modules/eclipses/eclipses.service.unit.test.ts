import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { EclipseCalculationService } from "./eclipse-calculation.service";
import { EclipseEventService } from "./eclipse-event.service";
import { EclipsesService } from "./eclipses.service";

import type { Event } from "../calendar/calendar.types";

const createEvent = (description: string, categories: string[]): Event => {
  const timestamp = moment.utc("2024-04-08T18:00:00.000Z");
  return {
    categories,
    description,
    end: timestamp,
    start: timestamp,
    summary: description,
  };
};

describe(EclipsesService, () => {
  let service: EclipsesService;
  const logger = new LoggerService();

  const eclipseCalculationService = {
    getAllEclipseCoordinates:
      vi.fn<EclipseCalculationService["getAllEclipseCoordinates"]>(),
    getGeocentricEvents:
      vi.fn<EclipseCalculationService["getGeocentricEvents"]>(),
    getTopocentricEventsForDetect:
      vi.fn<EclipseCalculationService["getTopocentricEventsForDetect"]>(),
  };

  const eclipseEventService = {
    buildLunarEclipseEvent:
      vi.fn<EclipseEventService["buildLunarEclipseEvent"]>(),
    buildSolarEclipseEvent:
      vi.fn<EclipseEventService["buildSolarEclipseEvent"]>(),
    detectProgressive: vi.fn<EclipseEventService["detectProgressive"]>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipsesService,
        {
          provide: LoggerService,
          useValue: logger,
        },
        {
          provide: EclipseCalculationService,
          useValue: eclipseCalculationService,
        },
        {
          provide: EclipseEventService,
          useValue: eclipseEventService,
        },
      ],
    }).compile();

    service = await module.resolve(EclipsesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildLunarEclipseEvent", () => {
    it("delegates lunar event building", () => {
      const timestamp = moment.utc("2024-09-18T02:00:00.000Z");
      const expectedEvent = createEvent("Lunar Eclipse begins", ["Eclipse"]);
      eclipseEventService.buildLunarEclipseEvent.mockReturnValue(expectedEvent);

      const result = service.buildLunarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "beginning",
      });

      expect(eclipseEventService.buildLunarEclipseEvent).toHaveBeenCalledWith({
        date: timestamp,
        frame: "geocentric",
        phase: "beginning",
      });
      expect(result).toStrictEqual(expectedEvent);
    });
  });

  describe("buildSolarEclipseEvent", () => {
    it("delegates solar event building", () => {
      const timestamp = moment.utc("2024-04-08T18:00:00.000Z");
      const expectedEvent = createEvent("Solar Eclipse begins", ["Eclipse"]);
      eclipseEventService.buildSolarEclipseEvent.mockReturnValue(expectedEvent);

      const result = service.buildSolarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "beginning",
      });

      expect(eclipseEventService.buildSolarEclipseEvent).toHaveBeenCalledWith({
        date: timestamp,
        frame: "geocentric",
        phase: "beginning",
      });
      expect(result).toStrictEqual(expectedEvent);
    });
  });

  describe("detect", () => {
    it("combines geocentric and topocentric events when visibility ephemeris is provided", () => {
      const coordinates = {
        currentCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 100,
          longitudeSun: 100,
        },
        nextCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 101,
          longitudeSun: 100,
        },
        previousCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 99,
          longitudeSun: 100,
        },
      };
      const geocentricEvent = createEvent("Solar Eclipse begins", [
        "Astronomy",
        "Astrology",
        "Eclipse",
        "Solar",
        "Geocentric",
      ]);
      const topocentricEvent = createEvent("Solar Eclipse begins", [
        "Astronomy",
        "Astrology",
        "Eclipse",
        "Solar",
        "Topocentric Visibility",
      ]);

      eclipseCalculationService.getAllEclipseCoordinates.mockReturnValue(
        coordinates,
      );
      eclipseCalculationService.getGeocentricEvents.mockReturnValue({
        events: [geocentricEvent],
        lunarPhase: null,
        solarPhase: "beginning",
      });
      eclipseCalculationService.getTopocentricEventsForDetect.mockReturnValue([
        topocentricEvent,
      ]);

      const minute = moment.utc("2024-04-08T18:00:00.000Z");
      const result = service.detect({
        minute,
        moonAzimuthElevationEphemeris: {},
        moonCoordinateEphemeris: {},
        moonDiameterEphemeris: {},
        sunAzimuthElevationEphemeris: {},
        sunCoordinateEphemeris: {},
        sunDiameterEphemeris: {},
      });

      expect(result).toStrictEqual([geocentricEvent, topocentricEvent]);
      expect(
        eclipseCalculationService.getTopocentricEventsForDetect,
      ).toHaveBeenCalledTimes(1);
    });

    it("returns only geocentric events when visibility ephemeris is omitted", () => {
      const geocentricEvent = createEvent("Lunar Eclipse maximum", [
        "Astronomy",
        "Astrology",
        "Eclipse",
        "Lunar",
        "Geocentric",
      ]);
      eclipseCalculationService.getAllEclipseCoordinates.mockReturnValue({
        currentCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 280,
          longitudeSun: 100,
        },
        nextCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 281,
          longitudeSun: 100,
        },
        previousCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 279,
          longitudeSun: 100,
        },
      });
      eclipseCalculationService.getGeocentricEvents.mockReturnValue({
        events: [geocentricEvent],
        lunarPhase: "maximum",
        solarPhase: null,
      });
      eclipseCalculationService.getTopocentricEventsForDetect.mockReturnValue(
        [],
      );

      const minute = moment.utc("2024-09-18T02:30:00.000Z");
      const result = service.detect({
        minute,
        moonCoordinateEphemeris: {},
        moonDiameterEphemeris: {},
        sunCoordinateEphemeris: {},
        sunDiameterEphemeris: {},
      });

      expect(result).toStrictEqual([geocentricEvent]);
      expect(
        eclipseCalculationService.getTopocentricEventsForDetect,
      ).not.toHaveBeenCalled();
    });
  });

  describe("detectProgressive", () => {
    it("delegates progressive eclipse event synthesis", () => {
      const sourceEvent = createEvent("Solar Eclipse begins", [
        "Astronomy",
        "Astrology",
        "Eclipse",
      ]);
      const progressiveEvent = createEvent("Solar Eclipse (Geocentric)", [
        "Astronomy",
        "Astrology",
        "Eclipse",
      ]);
      eclipseEventService.detectProgressive.mockReturnValue([progressiveEvent]);

      const result = service.detectProgressive([sourceEvent]);

      expect(eclipseEventService.detectProgressive).toHaveBeenCalledWith([
        sourceEvent,
      ]);
      expect(result).toStrictEqual([progressiveEvent]);
    });
  });
});
