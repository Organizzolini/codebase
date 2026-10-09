import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { TwilightsBuilderService } from "./twilights-builder.service";
import { TwilightsComposerService } from "./twilights-composer.service";
import { TwilightsDetectorService } from "./twilights-detector.service";
import { TwilightsService } from "./twilights.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

describe(TwilightsService, () => {
  let service: TwilightsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        TwilightsBuilderService,
        TwilightsComposerService,
        TwilightsDetectorService,
        TwilightsService,
        MathService,
        ProgressiveUtilitiesService,
      ],
    }).compile();
    service = await module.resolve(TwilightsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detect", () => {
    it("detects civil dawn transition", () => {
      const currentMinute = moment.utc("2024-03-21T06:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");
      const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
        [currentMinute.toISOString()]: {
          azimuth: 86,
          eclipticLatitude: 0,
          eclipticLongitude: 0,
          elevation: -5.9,
          semidiameter: 0.27,
          trueElevation: -5.9,
        },
        [previousMinute.toISOString()]: {
          azimuth: 85,
          eclipticLatitude: 0,
          eclipticLongitude: 0,
          elevation: -6.1,
          semidiameter: 0.27,
          trueElevation: -6.1,
        },
      };

      const events = service.detect({
        minute: currentMinute,
        sunAzimuthElevationEphemeris,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Civil Dawn");
    });

    it("returns no transition when no threshold crossing occurs", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");
      const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
        [currentMinute.toISOString()]: {
          azimuth: 161,
          eclipticLatitude: 0,
          eclipticLongitude: 0,
          elevation: 45,
          semidiameter: 0.27,
          trueElevation: 45,
        },
        [previousMinute.toISOString()]: {
          azimuth: 160,
          eclipticLatitude: 0,
          eclipticLongitude: 0,
          elevation: 44,
          semidiameter: 0.27,
          trueElevation: 44,
        },
      };

      const events = service.detect({
        minute: currentMinute,
        sunAzimuthElevationEphemeris,
      });

      expect(events).toHaveLength(0);
    });
  });

  describe("detectProgressive", () => {
    it("builds Daylight and Night progressive spans", () => {
      const astronomicalDawn: DetectedCalendarEvent = {
        categories: ["Astronomy", "Astrology", "Twilight", "Astronomical Dawn"],
        description: "Astronomical Dawn",
        end: moment.utc("2024-03-22T05:00:00.000Z"),
        start: moment.utc("2024-03-22T05:00:00.000Z"),
        summary: "🌠 Astronomical Dawn",
      };
      const civilDawn: DetectedCalendarEvent = {
        categories: ["Astronomy", "Astrology", "Twilight", "Civil Dawn"],
        description: "Civil Dawn",
        end: moment.utc("2024-03-21T06:00:00.000Z"),
        start: moment.utc("2024-03-21T06:00:00.000Z"),
        summary: "🌄 Civil Dawn",
      };
      const civilDusk: DetectedCalendarEvent = {
        categories: ["Astronomy", "Astrology", "Twilight", "Civil Dusk"],
        description: "Civil Dusk",
        end: moment.utc("2024-03-21T19:00:00.000Z"),
        start: moment.utc("2024-03-21T19:00:00.000Z"),
        summary: "🌇 Civil Dusk",
      };
      const astronomicalDusk: DetectedCalendarEvent = {
        categories: ["Astronomy", "Astrology", "Twilight", "Astronomical Dusk"],
        description: "Astronomical Dusk",
        end: moment.utc("2024-03-21T20:00:00.000Z"),
        start: moment.utc("2024-03-21T20:00:00.000Z"),
        summary: "🌌 Astronomical Dusk",
      };

      const events = service.detectProgressive([
        civilDawn,
        civilDusk,
        astronomicalDusk,
        astronomicalDawn,
      ]);

      expect(events.some((event) => event.description === "Daylight")).toBe(
        true,
      );
      expect(events.some((event) => event.description === "Night")).toBe(true);
    });
  });

  describe("static constants", () => {
    it("exposes twilight thresholds and constants", () => {
      expect(TwilightsService.twilights).toStrictEqual([
        "civil",
        "nautical",
        "astronomical",
      ]);
      expect(TwilightsService.degreesByTwilight.civil).toBe(6);
      expect(TwilightsService.degreesByTwilight.nautical).toBe(12);
      expect(TwilightsService.degreesByTwilight.astronomical).toBe(18);
      expect(TwilightsService.sunRadiusDegrees).toBeCloseTo(16 / 60, 5);
    });
  });

  describe("detect delegation", () => {
    const buildEvent = (description: string): DetectedCalendarEvent => {
      const timestamp = moment.utc("2024-03-21T00:00:00.000Z");
      return {
        categories: ["Twilight"],
        description,
        end: timestamp,
        start: timestamp,
        summary: description,
      };
    };

    it("delegates builder methods to the wrapped service", () => {
      const mockBuilderService = {
        buildAstronomicalDawnEvent: vi
          .fn<(date: Moment) => DetectedCalendarEvent>()
          .mockReturnValue(buildEvent("AD")),
        buildAstronomicalDuskEvent: vi
          .fn<(date: Moment) => DetectedCalendarEvent>()
          .mockReturnValue(buildEvent("ADK")),
        buildCivilDawnEvent: vi
          .fn<(date: Moment) => DetectedCalendarEvent>()
          .mockReturnValue(buildEvent("CD")),
        buildCivilDuskEvent: vi
          .fn<(date: Moment) => DetectedCalendarEvent>()
          .mockReturnValue(buildEvent("CDK")),
        buildNauticalDawnEvent: vi
          .fn<(date: Moment) => DetectedCalendarEvent>()
          .mockReturnValue(buildEvent("ND")),
        buildNauticalDuskEvent: vi
          .fn<(date: Moment) => DetectedCalendarEvent>()
          .mockReturnValue(buildEvent("NDK")),
      };
      const mockComposerService = {
        buildDawnProgressiveEvents: vi
          .fn<
            (
              astronomicalDawnEvents: DetectedCalendarEvent[],
              nauticalDawnEvents: DetectedCalendarEvent[],
              civilDawnEvents: DetectedCalendarEvent[],
            ) => DetectedCalendarEvent[]
          >()
          .mockReturnValue([buildEvent("dawn")]),
        buildDuskProgressiveEvents: vi
          .fn<
            (args: {
              astronomicalDuskEvents: DetectedCalendarEvent[];
              civilDawnEvents: DetectedCalendarEvent[];
              civilDuskEvents: DetectedCalendarEvent[];
              nauticalDuskEvents: DetectedCalendarEvent[];
            }) => DetectedCalendarEvent[]
          >()
          .mockReturnValue([buildEvent("dusk")]),
        pairAndBuild: vi
          .fn<
            (args: {
              beginnings: DetectedCalendarEvent[];
              builder: (
                beginning: DetectedCalendarEvent,
                ending: DetectedCalendarEvent,
              ) => DetectedCalendarEvent;
              endings: DetectedCalendarEvent[];
              label: string;
            }) => DetectedCalendarEvent[]
          >()
          .mockReturnValue([buildEvent("pair")]),
      };
      const mockDetectorService = {
        buildTwilightTransitionEvents: vi
          .fn<
            (
              elevations: {
                currentElevation: number;
                previousElevation: number;
              },
              date: Moment,
            ) => DetectedCalendarEvent[]
          >()
          .mockReturnValue([buildEvent("transition")]),
        getSunElevations: vi
          .fn<
            (
              sunAzimuthElevationEphemeris: AzimuthElevationEphemeris,
              minute: Moment,
            ) => { currentElevation: number; previousElevation: number }
          >()
          .mockReturnValue({ currentElevation: 0, previousElevation: 0 }),
      };
      const delegatedService = new TwilightsService(
        mockBuilderService as never,
        mockComposerService as never,
        mockDetectorService as never,
        new LoggerService(),
      );
      const timestamp = moment.utc("2024-03-21T06:00:00.000Z");

      expect(
        delegatedService.buildAstronomicalDawnEvent(timestamp),
      ).toStrictEqual(buildEvent("AD"));
      expect(
        delegatedService.buildAstronomicalDuskEvent(timestamp),
      ).toStrictEqual(buildEvent("ADK"));
      expect(delegatedService.buildCivilDawnEvent(timestamp)).toStrictEqual(
        buildEvent("CD"),
      );
      expect(delegatedService.buildCivilDuskEvent(timestamp)).toStrictEqual(
        buildEvent("CDK"),
      );
      expect(delegatedService.buildNauticalDawnEvent(timestamp)).toStrictEqual(
        buildEvent("ND"),
      );
      expect(delegatedService.buildNauticalDuskEvent(timestamp)).toStrictEqual(
        buildEvent("NDK"),
      );
      expect(
        mockBuilderService.buildAstronomicalDawnEvent,
      ).toHaveBeenCalledWith(timestamp);
      expect(mockBuilderService.buildNauticalDuskEvent).toHaveBeenCalledWith(
        timestamp,
      );
    });

    it("delegates detection and progressive pairing", () => {
      const mockBuilderService = {
        buildAstronomicalDawnEvent:
          vi.fn<(date: Moment) => DetectedCalendarEvent>(),
        buildAstronomicalDuskEvent:
          vi.fn<(date: Moment) => DetectedCalendarEvent>(),
        buildCivilDawnEvent: vi.fn<(date: Moment) => DetectedCalendarEvent>(),
        buildCivilDuskEvent: vi.fn<(date: Moment) => DetectedCalendarEvent>(),
        buildNauticalDawnEvent:
          vi.fn<(date: Moment) => DetectedCalendarEvent>(),
        buildNauticalDuskEvent:
          vi.fn<(date: Moment) => DetectedCalendarEvent>(),
      };
      const mockTransitionEvents = [buildEvent("transition")];
      const mockComposerService = {
        buildDawnProgressiveEvents: vi
          .fn<
            (
              astronomicalDawnEvents: DetectedCalendarEvent[],
              nauticalDawnEvents: DetectedCalendarEvent[],
              civilDawnEvents: DetectedCalendarEvent[],
            ) => DetectedCalendarEvent[]
          >()
          .mockReturnValue([buildEvent("dawn")]),
        buildDuskProgressiveEvents: vi
          .fn<
            (args: {
              astronomicalDuskEvents: DetectedCalendarEvent[];
              civilDawnEvents: DetectedCalendarEvent[];
              civilDuskEvents: DetectedCalendarEvent[];
              nauticalDuskEvents: DetectedCalendarEvent[];
            }) => DetectedCalendarEvent[]
          >()
          .mockReturnValue([buildEvent("dusk")]),
        pairAndBuild: vi
          .fn<
            (args: {
              beginnings: DetectedCalendarEvent[];
              builder: (
                beginning: DetectedCalendarEvent,
                ending: DetectedCalendarEvent,
              ) => DetectedCalendarEvent;
              endings: DetectedCalendarEvent[];
              label: string;
            }) => DetectedCalendarEvent[]
          >()
          .mockReturnValue([buildEvent("pair")]),
      };
      const mockDetectorService = {
        buildTwilightTransitionEvents: vi
          .fn<
            (
              elevations: {
                currentElevation: number;
                previousElevation: number;
              },
              date: Moment,
            ) => DetectedCalendarEvent[]
          >()
          .mockReturnValue(mockTransitionEvents),
        getSunElevations: vi
          .fn<
            (
              sunAzimuthElevationEphemeris: AzimuthElevationEphemeris,
              minute: Moment,
            ) => { currentElevation: number; previousElevation: number }
          >()
          .mockReturnValue({ currentElevation: 0, previousElevation: 0 }),
      };
      const delegatedService = new TwilightsService(
        mockBuilderService as never,
        mockComposerService as never,
        mockDetectorService as never,
        new LoggerService(),
      );
      const minute = moment.utc("2024-03-21T06:00:00.000Z");
      const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
        [minute.toISOString()]: {
          azimuth: 180,
          eclipticLatitude: 0,
          eclipticLongitude: 0,
          elevation: -6,
          semidiameter: 0.27,
          trueElevation: -6,
        },
      };

      expect(
        delegatedService.detect({ minute, sunAzimuthElevationEphemeris }),
      ).toStrictEqual(mockTransitionEvents);
      expect(mockDetectorService.getSunElevations).toHaveBeenCalledWith(
        sunAzimuthElevationEphemeris,
        minute,
      );
      expect(
        delegatedService.detectProgressive([
          {
            categories: ["Twilight", "Astronomical Dawn"],
            description: "Astronomical Dawn",
            end: minute,
            start: minute,
            summary: "Astronomical Dawn",
          },
          {
            categories: ["Twilight", "Astronomical Dusk"],
            description: "Astronomical Dusk",
            end: minute,
            start: minute,
            summary: "Astronomical Dusk",
          },
        ]),
      ).toStrictEqual([
        buildEvent("dawn"),
        buildEvent("dusk"),
        buildEvent("pair"),
      ]);
    });
  });
});
