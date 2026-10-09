import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { CalendarService } from "../calendar/calendar.service";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";

import { DailyCyclesBuilderService } from "./daily-cycles-builder.service";
import { DailyCyclesService } from "./daily-cycles.service";

import type {
  AzimuthElevationEphemeris,
  HorizonPosition,
} from "../ephemeris/ephemeris.types";
import type { LogData } from "@codebase/logging";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

/** A horizon sample whose true elevation matches its apparent one unless given. */
function horizon(
  azimuth: number,
  elevation: number,
  trueElevation = elevation,
): HorizonPosition {
  return { azimuth, elevation, semidiameter: 0.27, trueElevation };
}

/** Three consecutive minutes of true elevation around `minute`, as an ephemeris. */
function riseSetEphemeris(args: {
  minute: Moment;
  semidiameter?: number;
  trueElevations: [previous: number, current: number, next: number];
}): AzimuthElevationEphemeris {
  const { minute, semidiameter = 0.27, trueElevations } = args;
  const [previous, current, next] = trueElevations;
  const sample = (trueElevation: number): HorizonPosition => ({
    azimuth: 90,
    elevation: trueElevation,
    semidiameter,
    trueElevation,
  });
  return {
    [minute.clone().add(1, "minute").toISOString()]: sample(next),
    [minute.clone().subtract(1, "minute").toISOString()]: sample(previous),
    [minute.toISOString()]: sample(current),
  };
}

describe(DailyCyclesService, () => {
  let service: DailyCyclesService;

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
  });

  describe("dailySolarCycle.events", () => {
    describe("detect", () => {
      it("detects solar zenith when sun reaches maximum elevation", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Sun at local maximum elevation
        const sunAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: horizon(180, 45),
          [nextMinute.toISOString()]: horizon(182, 44.9),
          [previousMinute.toISOString()]: horizon(178, 44.9),
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
          [currentMinute.toISOString()]: horizon(0, -45),
          [nextMinute.toISOString()]: horizon(2, -44.9),
          [previousMinute.toISOString()]: horizon(358, -44.9),
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
          [currentMinute.toISOString()]: horizon(151, 30),
          [nextMinute.toISOString()]: horizon(152, 31),
          [previousMinute.toISOString()]: horizon(150, 29),
        };

        const events = service.getDailySolarCycleEvents({
          minute: currentMinute,
          sunAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(0);
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
      it("detects lunar zenith when moon reaches maximum elevation", () => {
        const currentMinute = moment.utc("2024-03-22T01:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");

        // Moon at local maximum elevation
        const moonAzimuthElevationEphemeris: AzimuthElevationEphemeris = {
          [currentMinute.toISOString()]: horizon(180, 40),
          [nextMinute.toISOString()]: horizon(182, 39.9),
          [previousMinute.toISOString()]: horizon(178, 39.9),
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
          [currentMinute.toISOString()]: horizon(0, -40),
          [nextMinute.toISOString()]: horizon(2, -39.9),
          [previousMinute.toISOString()]: horizon(358, -39.9),
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
          [currentMinute.toISOString()]: horizon(151, 30),
          [nextMinute.toISOString()]: horizon(152, 31),
          [previousMinute.toISOString()]: horizon(150, 29),
        };

        const events = service.getDailyLunarCycleEvents({
          minute: currentMinute,
          moonAzimuthElevationEphemeris,
        });

        expect(events).toHaveLength(0);
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

  describe("rise and set", () => {
    const minute = moment.utc("2026-03-20T11:04:00.000Z");
    const sunriseSummary = "☀️ 🔼 Sunrise";
    const sunsetSummary = "☀️ 🔽 Sunset";
    const moonriseSummary = "🌙 🔼 Moonrise";
    const moonsetSummary = "🌙 🔽 Moonset";

    function solarSummaries(
      trueElevations: [number, number, number],
    ): string[] {
      return service
        .getDailySolarCycleEvents({
          minute,
          sunAzimuthElevationEphemeris: riseSetEphemeris({
            minute,
            trueElevations,
          }),
        })
        .map((event) => event.summary);
    }

    function lunarSummaries(args: {
      semidiameter: number;
      trueElevations: [number, number, number];
    }): string[] {
      return service
        .getDailyLunarCycleEvents({
          minute,
          moonAzimuthElevationEphemeris: riseSetEphemeris({ minute, ...args }),
        })
        .map((event) => event.summary);
    }

    it("rises the Sun when its true elevation crosses the standard -0.8333 degrees", () => {
      expect(solarSummaries([-0.9, -0.8, -0.7])).toContain(sunriseSummary);
    });

    it("sets the Sun when its true elevation crosses the standard -0.8333 degrees", () => {
      expect(solarSummaries([-0.7, -0.8, -0.9])).toContain(sunsetSummary);
    });

    it("ignores the Sun crossing the old -16 arcminute line above the standard altitude", () => {
      expect(solarSummaries([-0.3, -0.2, -0.1])).toStrictEqual([]);
    });

    it("stamps a rise on the minute nearest the crossing, not the minute after it", () => {
      // Crossing 4 seconds after the previous minute: it belongs to that minute.
      expect(solarSummaries([-0.84, -0.74, -0.64])).not.toContain(
        sunriseSummary,
      );
      // Crossing 10 seconds after this minute: it belongs to this minute.
      expect(solarSummaries([-0.88, -0.84, -0.8])).toContain(sunriseSummary);
    });

    it("stamps a set on the minute nearest the crossing, not the minute after it", () => {
      expect(solarSummaries([-0.83, -0.93, -1.03])).not.toContain(
        sunsetSummary,
      );
      expect(solarSummaries([-0.79, -0.83, -0.87])).toContain(sunsetSummary);
    });

    it("rises the Moon when its upper limb clears refraction and its own semidiameter", () => {
      // Threshold -(34 arcminutes + 0.3 degrees) = -0.8667 degrees.
      expect(
        lunarSummaries({
          semidiameter: 0.3,
          trueElevations: [-0.9, -0.86, -0.82],
        }),
      ).toContain(moonriseSummary);
      // Threshold -(34 arcminutes + 0.2 degrees) = -0.7667 degrees: not yet risen.
      expect(
        lunarSummaries({
          semidiameter: 0.2,
          trueElevations: [-0.9, -0.86, -0.82],
        }),
      ).not.toContain(moonriseSummary);
    });

    it("sets the Moon when its upper limb drops below refraction and its own semidiameter", () => {
      expect(
        lunarSummaries({
          semidiameter: 0.3,
          trueElevations: [-0.82, -0.86, -0.9],
        }),
      ).toContain(moonsetSummary);
      expect(
        lunarSummaries({
          semidiameter: 0.2,
          trueElevations: [-0.82, -0.86, -0.9],
        }),
      ).not.toContain(moonsetSummary);
    });
  });
});
