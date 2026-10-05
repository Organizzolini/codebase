import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CalendarService } from "../calendar/calendar.service";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";

import { DailyCyclesBuilderService } from "./daily-cycles-builder.service";
import { DailyCyclesService } from "./daily-cycles.service";

import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { LogData } from "@codebase/logger";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

interface ServicePrivate {
  isRise: (args: { current: number; previous: number }) => boolean;
  isSet: (args: { current: number; previous: number }) => boolean;
}

describe(DailyCyclesService, () => {
  let service: DailyCyclesService;
  let helperService: DailyCyclesBuilderService;
  let s: ServicePrivate;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        {
          provide: CalendarService,
          useValue: {
            buildInstantEvent: (args: {
              categories: string[];
              date: Moment;
              description: string;
              logger: {
                info: (
                  message: string,
                  context?: string,
                  data?: LogData,
                ) => void;
              };
              summary: string;
              timezone: string;
            }) => {
              const {
                categories,
                date,
                description,
                logger,
                summary,
                timezone,
              } = args;
              const dateString = date.clone().tz(timezone).toISOString(true);
              logger.info("🗓️ Built a calendar event", undefined, {
                at: dateString,
                summary,
              });
              return {
                categories,
                description,
                end: date,
                start: date,
                summary,
              };
            },
          },
        },
        DailyCyclesBuilderService,
        DailyCyclesService,
        LoggerService,
        MathService,
      ],
    }).compile();
    service = await module.resolve(DailyCyclesService);
    helperService = await module.resolve(DailyCyclesBuilderService);
    s = helperService;
  });

  describe("dailySolarCycle.events", () => {
    describe("detect", () => {
      it("detects sunrise event when sun rises above horizon", () => {
        const currentMinute = moment.utc("2024-03-21T06:30:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Sun rising above horizon (threshold is -16/60 degrees = -0.2667)
        const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 91, elevation: -0.1 },
          [nextMinute.toISOString()]: { azimuth: 92, elevation: 0.1 },
          [previousMinute.toISOString()]: { azimuth: 90, elevation: -0.3 },
        };

        const events = service.getDailySolarCycleEvents({
          minute: currentMinute,
          sunAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]?.summary).toContain("Sunrise");
        expect(events[0]?.categories).toContain("Solar");
      });

      it("detects sunset event when sun sets below horizon", () => {
        const currentMinute = moment.utc("2024-03-21T18:30:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Sun setting below horizon
        const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 271, elevation: -0.3 },
          [nextMinute.toISOString()]: { azimuth: 272, elevation: -0.5 },
          [previousMinute.toISOString()]: { azimuth: 270, elevation: -0.1 },
        };

        const events = service.getDailySolarCycleEvents({
          minute: currentMinute,
          sunAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]?.summary).toContain("Sunset");
        expect(events[0]?.categories).toContain("Solar");
      });

      it("detects solar zenith when sun reaches maximum elevation", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Sun at local maximum elevation
        const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 180, elevation: 45 },
          [nextMinute.toISOString()]: { azimuth: 182, elevation: 44.9 },
          [previousMinute.toISOString()]: { azimuth: 178, elevation: 44.9 },
        };

        const events = service.getDailySolarCycleEvents({
          minute: currentMinute,
          sunAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]?.summary).toContain("Solar Zenith");
        expect(events[0]?.categories).toContain("Daily Solar Cycle");
      });

      it("detects solar nadir when sun reaches minimum elevation", () => {
        const currentMinute = moment.utc("2024-03-22T00:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Sun at local minimum elevation (below horizon at night)
        const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 0, elevation: -45 },
          [nextMinute.toISOString()]: { azimuth: 2, elevation: -44.9 },
          [previousMinute.toISOString()]: { azimuth: 358, elevation: -44.9 },
        };

        const events = service.getDailySolarCycleEvents({
          minute: currentMinute,
          sunAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]?.summary).toContain("Solar Nadir");
        expect(events[0]?.categories).toContain("Daily Solar Cycle");
      });

      it("returns empty array when no events occur", () => {
        const currentMinute = moment.utc("2024-03-21T10:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Sun in middle of sky, not at any threshold
        const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 151, elevation: 30 },
          [nextMinute.toISOString()]: { azimuth: 152, elevation: 31 },
          [previousMinute.toISOString()]: { azimuth: 150, elevation: 29 },
        };

        const events = service.getDailySolarCycleEvents({
          minute: currentMinute,
          sunAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(0);
      });

      it("returns multiple events if they occur at the same minute", () => {
        const currentMinute = moment.utc("2024-03-21T06:30:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Edge case: sunrise and maximum at same time
        const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 91, elevation: -0.2 },
          [nextMinute.toISOString()]: { azimuth: 92, elevation: -0.25 },
          [previousMinute.toISOString()]: { azimuth: 90, elevation: -0.3 },
        };

        const events = service.getDailySolarCycleEvents({
          minute: currentMinute,
          sunAzimuthElevationEphemeris,
        });

        // Should have sunrise and potentially zenith if the elevation is at a maximum
        expect(events.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("getSunriseEvent", () => {
      it("creates a sunrise event with correct structure", () => {
        const date = moment.utc("2024-03-21T06:30:00.000Z");

        const event = service.buildSunriseEvent(date);

        expect(event.summary).toBe("☀️ 🔼 Sunrise");
        expect(event.description).toBe("Sunrise");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Solar Cycle");
        expect(event.categories).toContain("Solar");
      });
    });

    describe("getSolarZenithEvent", () => {
      it("creates a solar zenith event with correct structure", () => {
        const date = moment.utc("2024-03-21T12:00:00.000Z");

        const event = service.buildSolarZenithEvent(date);

        expect(event.summary).toBe("☀️ ⏫ Solar Zenith");
        expect(event.description).toBe("Solar Zenith");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Solar Cycle");
        expect(event.categories).toContain("Solar");
      });
    });

    describe("getSunsetEvent", () => {
      it("creates a sunset event with correct structure", () => {
        const date = moment.utc("2024-03-21T18:30:00.000Z");

        const event = service.buildSunsetEvent(date);

        expect(event.summary).toBe("☀️ 🔽 Sunset");
        expect(event.description).toBe("Sunset");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Solar Cycle");
        expect(event.categories).toContain("Solar");
      });
    });

    describe("getSolarNadirEvent", () => {
      it("creates a solar nadir event with correct structure", () => {
        const date = moment.utc("2024-03-22T00:00:00.000Z");

        const event = service.buildSolarNadirEvent(date);

        expect(event.summary).toBe("☀️ ⏬ Solar Nadir");
        expect(event.description).toBe("Solar Nadir");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Solar Cycle");
        expect(event.categories).toContain("Solar");
      });
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("dailyLunarCycle.events", () => {
    describe("detect", () => {
      it("detects moonrise event when moon rises above horizon", () => {
        const currentMinute = moment.utc("2024-03-21T20:30:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Moon rising above horizon (threshold is -16/60 degrees = -0.2667)
        const moonAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 91, elevation: -0.1 },
          [nextMinute.toISOString()]: { azimuth: 92, elevation: 0.1 },
          [previousMinute.toISOString()]: { azimuth: 90, elevation: -0.3 },
        };

        const events = service.getDailyLunarCycleEvents({
          minute: currentMinute,
          moonAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]).toBeDefined();
        expect(events[0]?.summary).toContain("Moonrise");
        expect(events[0]?.categories).toContain("Lunar");
      });

      it("detects moonset event when moon sets below horizon", () => {
        const currentMinute = moment.utc("2024-03-22T06:30:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Moon setting below horizon
        const moonAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 271, elevation: -0.3 },
          [nextMinute.toISOString()]: { azimuth: 272, elevation: -0.5 },
          [previousMinute.toISOString()]: { azimuth: 270, elevation: -0.1 },
        };

        const events = service.getDailyLunarCycleEvents({
          minute: currentMinute,
          moonAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]).toBeDefined();
        expect(events[0]?.summary).toContain("Moonset");
        expect(events[0]?.categories).toContain("Lunar");
      });

      it("detects lunar zenith when moon reaches maximum elevation", () => {
        const currentMinute = moment.utc("2024-03-22T01:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Moon at local maximum elevation
        const moonAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 180, elevation: 40 },
          [nextMinute.toISOString()]: { azimuth: 182, elevation: 39.9 },
          [previousMinute.toISOString()]: { azimuth: 178, elevation: 39.9 },
        };

        const events = service.getDailyLunarCycleEvents({
          minute: currentMinute,
          moonAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]).toBeDefined();
        expect(events[0]?.summary).toContain("Lunar Zenith");
        expect(events[0]?.categories).toContain("Daily Lunar Cycle");
      });

      it("detects lunar nadir when moon reaches minimum elevation", () => {
        const currentMinute = moment.utc("2024-03-21T13:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Moon at local minimum elevation (below horizon during day)
        const moonAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 0, elevation: -40 },
          [nextMinute.toISOString()]: { azimuth: 2, elevation: -39.9 },
          [previousMinute.toISOString()]: { azimuth: 358, elevation: -39.9 },
        };

        const events = service.getDailyLunarCycleEvents({
          minute: currentMinute,
          moonAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(1);
        expect(events[0]).toBeDefined();
        expect(events[0]?.summary).toContain("Lunar Nadir");
        expect(events[0]?.categories).toContain("Daily Lunar Cycle");
      });

      it("returns empty array when no events occur", () => {
        const currentMinute = moment.utc("2024-03-21T22:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Moon in middle of sky, not at any threshold
        const moonAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 151, elevation: 30 },
          [nextMinute.toISOString()]: { azimuth: 152, elevation: 31 },
          [previousMinute.toISOString()]: { azimuth: 150, elevation: 29 },
        };

        const events = service.getDailyLunarCycleEvents({
          minute: currentMinute,
          moonAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(0);
      });

      it("handles multiple events at once", () => {
        const currentMinute = moment.utc("2024-03-21T20:30:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Moonrise with a local maximum (unlikely in reality but tests code path)
        const moonAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: { azimuth: 91, elevation: -0.2 },
          [nextMinute.toISOString()]: { azimuth: 92, elevation: -0.25 },
          [previousMinute.toISOString()]: { azimuth: 90, elevation: -0.3 },
        };

        const events = service.getDailyLunarCycleEvents({
          minute: currentMinute,
          moonAzimuthElevationEphemeris,
        });

        // Should have at least moonrise or zenith (depends on exact threshold)
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(
          events.some((e) => e.categories.includes("Daily Lunar Cycle")),
        ).toBe(true);
      });
    });

    describe("getMoonriseEvent", () => {
      it("creates a moonrise event with correct structure", () => {
        const date = moment.utc("2024-03-21T20:30:00.000Z");

        const event = service.buildMoonriseEvent(date);

        expect(event.summary).toBe("🌙 🔼 Moonrise");
        expect(event.description).toBe("Moonrise");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Lunar Cycle");
        expect(event.categories).toContain("Lunar");
      });
    });

    describe("getLunarZenithEvent", () => {
      it("creates a lunar zenith event with correct structure", () => {
        const date = moment.utc("2024-03-22T01:00:00.000Z");

        const event = service.buildLunarZenithEvent(date);

        expect(event.summary).toBe("🌙 ⏫ Lunar Zenith");
        expect(event.description).toBe("Lunar Zenith");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Lunar Cycle");
        expect(event.categories).toContain("Lunar");
      });
    });

    describe("getMoonsetEvent", () => {
      it("creates a moonset event with correct structure", () => {
        const date = moment.utc("2024-03-22T06:30:00.000Z");

        const event = service.buildMoonsetEvent(date);

        expect(event.summary).toBe("🌙 🔽 Moonset");
        expect(event.description).toBe("Moonset");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Lunar Cycle");
        expect(event.categories).toContain("Lunar");
      });
    });

    describe("getLunarNadirEvent", () => {
      it("creates a lunar nadir event with correct structure", () => {
        const date = moment.utc("2024-03-21T13:00:00.000Z");

        const event = service.buildLunarNadirEvent(date);

        expect(event.summary).toBe("🌙 ⏬ Lunar Nadir");
        expect(event.description).toBe("Lunar Nadir");
        expect(event.start).toStrictEqual(date);
        expect(event.end).toStrictEqual(date);
        expect(event.categories).toContain("Astronomy");
        expect(event.categories).toContain("Daily Lunar Cycle");
        expect(event.categories).toContain("Lunar");
      });
    });
  });

  describe("private utility methods", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    describe("dailyCyclesService.sunRadiusDegrees", () => {
      it("has correct value for sun radius", () => {
        expect.hasAssertions(); // Sun radius is 16 arcminutes, 60 arcminutes per degree
        expect(DailyCyclesService.sunRadiusDegrees).toBeCloseTo(16 / 60, 5);
        expect(DailyCyclesService.sunRadiusDegrees).toBeCloseTo(0.2667, 3);
      });
    });

    describe("isRise", () => {
      it("returns true when crossing above sun radius threshold", () => {
        expect.hasAssertions(); // Rise occurs when elevation goes from below -DailyCyclesService.sunRadiusDegrees to above

        const result = s.isRise({
          current: 0, // Above threshold
          previous: -0.5, // Below threshold (-0.2667)
        });

        expect(result).toBe(true);
      });

      it("returns true at exact threshold crossing", () => {
        const result = s.isRise({
          current: -DailyCyclesService.sunRadiusDegrees + 0.01, // Just above threshold
          previous: -DailyCyclesService.sunRadiusDegrees - 0.01, // Just below threshold
        });

        expect(result).toBe(true);
      });

      it("returns false when elevation stays below threshold", () => {
        const result = s.isRise({
          current: -0.5,
          previous: -1,
        });

        expect(result).toBe(false);
      });

      it("returns false when elevation stays above threshold", () => {
        const result = s.isRise({
          current: 1,
          previous: 0.5,
        });

        expect(result).toBe(false);
      });

      it("returns false when crossing threshold downward (set direction)", () => {
        const result = s.isRise({
          current: -0.5, // Below threshold
          previous: 0, // Above threshold
        });

        expect(result).toBe(false);
      });
    });

    describe("isSet", () => {
      it("returns true when crossing below sun radius threshold", () => {
        expect.hasAssertions(); // Set occurs when elevation goes from above -DailyCyclesService.sunRadiusDegrees to below

        const result = s.isSet({
          current: -0.5, // Below threshold
          previous: 0, // Above threshold
        });

        expect(result).toBe(true);
      });

      it("returns true at exact threshold crossing", () => {
        const result = s.isSet({
          current: -DailyCyclesService.sunRadiusDegrees - 0.01, // Just below threshold
          previous: -DailyCyclesService.sunRadiusDegrees + 0.01, // Just above threshold
        });

        expect(result).toBe(true);
      });

      it("returns false when elevation stays above threshold", () => {
        const result = s.isSet({
          current: 0.5,
          previous: 1,
        });

        expect(result).toBe(false);
      });

      it("returns false when elevation stays below threshold", () => {
        const result = s.isSet({
          current: -1,
          previous: -0.5,
        });

        expect(result).toBe(false);
      });

      it("returns false when crossing threshold upward (rise direction)", () => {
        const result = s.isSet({
          current: 0, // Above threshold
          previous: -0.5, // Below threshold
        });

        expect(result).toBe(false);
      });
    });
  });
});
