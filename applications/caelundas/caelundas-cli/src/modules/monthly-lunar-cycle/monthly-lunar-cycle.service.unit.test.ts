import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import * as CaelundasTypes from "../caelundas/caelundas.types";
import { symbolByLunarPhase } from "../caelundas/symbol-caelundas.constants";
import { CalendarService } from "../calendar/calendar.service";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";

import { LunarApsidesService } from "./lunar-apsides.service";
import { MonthlyLunarCycleService } from "./monthly-lunar-cycle.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { LunarPhase } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { LogData } from "@codebase/logging";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

interface ServicePrivate {
  detectProgressive: (
    events: DetectedCalendarEvent[],
  ) => DetectedCalendarEvent[];
  extractLunarPhaseFromCategories: (
    categories: string[],
    enteringSummary: string,
  ) => LunarPhase | null;
  getMonthlyLunarCycleProgressiveEvent: (
    entering: DetectedCalendarEvent,
    exiting: DetectedCalendarEvent,
  ) => DetectedCalendarEvent | null;
}

describe(MonthlyLunarCycleService, () => {
  let service: MonthlyLunarCycleService;
  let s: ServicePrivate;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LunarApsidesService,
        MonthlyLunarCycleService,
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
            }): DetectedCalendarEvent => {
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
        LoggerService,
        MathService,
      ],
    }).compile();
    service = await module.resolve(MonthlyLunarCycleService);
    s = service as unknown as ServicePrivate;
  });

  /**
   * Runs `detect` over consecutive minutes of a synthetic sky, one sample per
   * minute, and returns every event from the minutes that have both
   * neighbors. The Moon sits `elongations[i]` degrees ahead of the Sun.
   */
  function detectSeries(args: {
    elongations: number[];
    sunLongitudes?: number[];
  }): DetectedCalendarEvent[] {
    const { elongations, sunLongitudes = [] } = args;
    const start = moment.utc("2026-10-26T04:00:00.000Z");
    const minutes = elongations.map((_elongation, index) =>
      start.clone().add(index, "minutes"),
    );
    const moonCoordinateEphemeris: CoordinateEphemeris = {};
    const sunCoordinateEphemeris: CoordinateEphemeris = {};
    for (const [index, minute] of minutes.entries()) {
      const sunLongitude = sunLongitudes[index] ?? 200;
      const elongation = elongations[index] ?? 0;
      sunCoordinateEphemeris[minute.toISOString()] = {
        latitude: 0,
        longitude: sunLongitude,
      };
      moonCoordinateEphemeris[minute.toISOString()] = {
        latitude: 5,
        longitude: (sunLongitude + elongation) % 360,
      };
    }
    return minutes.slice(1, -1).flatMap((minute) =>
      service.detect({
        minute,
        moonCoordinateEphemeris,
        sunCoordinateEphemeris,
      }),
    );
  }

  describe("detect", () => {
    it("returns no events when the elongation crosses no phase", () => {
      expect(detectSeries({ elongations: [10, 10.5, 11, 11.5] })).toStrictEqual(
        [],
      );
    });

    it.each([
      { elongations: [359.6, 359.9, 0.2, 0.5], summary: "🌙 🌑 New Moon" },
      {
        elongations: [89.6, 89.9, 90.2, 90.5],
        summary: "🌙 🌓 First Quarter Moon",
      },
      { elongations: [179.6, 179.9, 180.2, 180.5], summary: "🌙 🌕 Full Moon" },
      {
        elongations: [269.6, 269.9, 270.2, 270.5],
        summary: "🌙 🌗 Last Quarter Moon",
      },
    ])(
      "reports $summary once when Moon minus Sun longitude reaches it",
      ({ elongations, summary }) => {
        const events = detectSeries({ elongations });

        expect(events.map((event) => event.summary)).toStrictEqual([summary]);
      },
    );

    it("stamps the phase at the minute nearest the exact elongation", () => {
      // 90° falls 0.2 of a minute after 04:02, so 04:02 is nearest.
      const events = detectSeries({
        elongations: [89, 89.5, 89.9, 90.4, 90.9],
      });

      expect(events.map((event) => event.start.toISOString())).toStrictEqual([
        "2026-10-26T04:02:00.000Z",
      ]);
    });

    it("stamps the later minute when the exact elongation falls after the midpoint", () => {
      // 180° falls 0.8 of a minute after 04:02, so 04:03 is nearest.
      const events = detectSeries({
        elongations: [178.6, 179.1, 179.6, 180.1, 180.6],
      });

      expect(events.map((event) => event.start.toISOString())).toStrictEqual([
        "2026-10-26T04:03:00.000Z",
      ]);
    });

    it("measures elongation from the Sun even when the Sun crosses 0° Aries", () => {
      const events = detectSeries({
        elongations: [179.6, 179.9, 180.2, 180.5],
        sunLongitudes: [359.98, 359.99, 0, 0.01],
      });

      expect(events.map((event) => event.summary)).toStrictEqual([
        "🌙 🌕 Full Moon",
      ]);
    });

    it("reports only Full Moon when the Moon crosses 0° Aries opposite the Sun", () => {
      // The Moon's own longitude wraps 359.9° → 0.2° just as Moon − Sun
      // passes 180°, where the offset from the New Moon target jumps from
      // +179.9° to −179.8°; neither wrap may read as a New Moon.
      const events = detectSeries({
        elongations: [179.6, 179.9, 180.2, 180.5],
        sunLongitudes: [180, 180, 180, 180],
      });

      expect(events.map((event) => event.summary)).toStrictEqual([
        "🌙 🌕 Full Moon",
      ]);
    });

    it.each([
      {
        elongations: [44.6, 44.9, 45.2, 45.5],
        summary: "🌙 🌒 Waxing Crescent Moon",
      },
      {
        elongations: [134.6, 134.9, 135.2, 135.5],
        summary: "🌙 🌔 Waxing Gibbous Moon",
      },
      {
        elongations: [224.6, 224.9, 225.2, 225.5],
        summary: "🌙 🌖 Waning Gibbous Moon",
      },
      {
        elongations: [314.6, 314.9, 315.2, 315.5],
        summary: "🌙 🌘 Waning Crescent Moon",
      },
    ])(
      "reports $summary once when Moon minus Sun longitude reaches its octant",
      ({ elongations, summary }) => {
        const events = detectSeries({ elongations });

        expect(events.map((event) => event.summary)).toStrictEqual([summary]);
      },
    );

    it("does not report a crescent where the Moon is 25% illuminated", () => {
      // 25% illuminated is about 60° from the Sun, not the 45° octant.
      const events = detectSeries({ elongations: [59.4, 59.9, 60.4, 60.9] });

      expect(events).toStrictEqual([]);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getMonthlyLunarCycleEvent", () => {
    it("creates a new moon event with correct structure", () => {
      const date = moment.utc("2024-03-10T09:00:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "new",
      });

      expect(event.summary).toBe(`🌙 ${symbolByLunarPhase.new} New Moon`);
      expect(event.description).toBe("New Moon");
      expect(event.start).toStrictEqual(date);
      expect(event.end).toStrictEqual(date);
      expect(event.categories).toContain("Astronomy");
      expect(event.categories).toContain("Astrology");
      expect(event.categories).toContain("Monthly Lunar Cycle");
      expect(event.categories).toContain("Lunar");
      expect(event.categories).toContain("New");
    });

    it("creates a full moon event with correct structure", () => {
      const date = moment.utc("2024-03-25T07:00:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "full",
      });

      expect(event.summary).toBe(`🌙 ${symbolByLunarPhase.full} Full Moon`);
      expect(event.description).toBe("Full Moon");
      expect(event.categories).toContain("Full");
    });

    it("creates a first quarter event with correct structure", () => {
      const date = moment.utc("2024-03-17T04:11:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "first quarter",
      });

      expect(event.summary).toBe(
        `🌙 ${symbolByLunarPhase["first quarter"]} First Quarter Moon`,
      );
      expect(event.description).toBe("First Quarter Moon");
      expect(event.categories).toContain("First Quarter");
    });

    it("creates a last quarter event with correct structure", () => {
      const date = moment.utc("2024-04-02T03:15:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "last quarter",
      });

      expect(event.summary).toBe(
        `🌙 ${symbolByLunarPhase["last quarter"]} Last Quarter Moon`,
      );
      expect(event.description).toBe("Last Quarter Moon");
      expect(event.categories).toContain("Last Quarter");
    });

    it("creates a waxing crescent event with correct structure", () => {
      const date = moment.utc("2024-03-13T12:00:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "waxing crescent",
      });

      expect(event.summary).toBe(
        `🌙 ${symbolByLunarPhase["waxing crescent"]} Waxing Crescent Moon`,
      );
      expect(event.description).toBe("Waxing Crescent Moon");
      expect(event.categories).toContain("Waxing Crescent");
    });

    it("creates a waxing gibbous event with correct structure", () => {
      const date = moment.utc("2024-03-21T12:00:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "waxing gibbous",
      });

      expect(event.summary).toBe(
        `🌙 ${symbolByLunarPhase["waxing gibbous"]} Waxing Gibbous Moon`,
      );
      expect(event.description).toBe("Waxing Gibbous Moon");
      expect(event.categories).toContain("Waxing Gibbous");
    });

    it("creates a waning gibbous event with correct structure", () => {
      const date = moment.utc("2024-03-28T12:00:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "waning gibbous",
      });

      expect(event.summary).toBe(
        `🌙 ${symbolByLunarPhase["waning gibbous"]} Waning Gibbous Moon`,
      );
      expect(event.description).toBe("Waning Gibbous Moon");
      expect(event.categories).toContain("Waning Gibbous");
    });

    it("creates a waning crescent event with correct structure", () => {
      const date = moment.utc("2024-04-05T12:00:00.000Z");

      const event = service.buildMonthlyLunarCycleEvent({
        date,
        lunarPhase: "waning crescent",
      });

      expect(event.summary).toBe(
        `🌙 ${symbolByLunarPhase["waning crescent"]} Waning Crescent Moon`,
      );
      expect(event.description).toBe("Waning Crescent Moon");
      expect(event.categories).toContain("Waning Crescent");
    });
  });

  describe("detectProgressive", () => {
    it("creates progressive events between consecutive lunar phases", () => {
      const newMoon: DetectedCalendarEvent = {
        categories: [
          "Astronomy",
          "Astrology",
          "Monthly Lunar Cycle",
          "Lunar",
          "New",
        ],
        description: "New Moon",
        end: moment.utc("2024-03-10T09:00:00.000Z"),
        start: moment.utc("2024-03-10T09:00:00.000Z"),
        summary: "🌙 🌑 New Moon",
      };
      const waxingCrescent: DetectedCalendarEvent = {
        categories: [
          "Astronomy",
          "Astrology",
          "Monthly Lunar Cycle",
          "Lunar",
          "Waxing Crescent",
        ],
        description: "Waxing Crescent Moon",
        end: moment.utc("2024-03-13T12:00:00.000Z"),
        start: moment.utc("2024-03-13T12:00:00.000Z"),
        summary: "🌙 🌒 Waxing Crescent Moon",
      };
      const firstQuarter: DetectedCalendarEvent = {
        categories: [
          "Astronomy",
          "Astrology",
          "Monthly Lunar Cycle",
          "Lunar",
          "First Quarter",
        ],
        description: "First Quarter Moon",
        end: moment.utc("2024-03-17T04:11:00.000Z"),
        start: moment.utc("2024-03-17T04:11:00.000Z"),
        summary: "🌙 🌓 First Quarter Moon",
      };

      const progressiveEvents = service.detectProgressive([
        newMoon,
        waxingCrescent,
        firstQuarter,
      ]);

      // Should have progressive events between phases
      expect(progressiveEvents).toHaveLength(2);

      expect(progressiveEvents[0]).toBeDefined();
      expect(progressiveEvents[1]).toBeDefined();

      // First duration: New → Waxing Crescent
      expect(progressiveEvents[0]?.start).toStrictEqual(newMoon.start);
      expect(progressiveEvents[0]?.end).toStrictEqual(waxingCrescent.start);
      expect(progressiveEvents[0]?.description).toBe("New Moon");

      // Second duration: Waxing Crescent → First Quarter
      expect(progressiveEvents[1]?.start).toStrictEqual(waxingCrescent.start);
      expect(progressiveEvents[1]?.end).toStrictEqual(firstQuarter.start);
      expect(progressiveEvents[1]?.description).toBe("Waxing Crescent Moon");
    });

    it("returns empty array when no lunar cycle events provided", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("filters out non-lunar cycle events", () => {
      const nonLunarEvent: DetectedCalendarEvent = {
        categories: ["Astronomy", "Something Else"],
        description: "Not a lunar event",
        end: moment.utc("2024-03-10T09:00:00.000Z"),
        start: moment.utc("2024-03-10T09:00:00.000Z"),
        summary: "Some other event",
      };

      const progressiveEvents = service.detectProgressive([nonLunarEvent]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("handles full lunar cycle", () => {
      const phases: { date: string; phase: LunarPhase }[] = [
        { date: "2024-03-10T09:00:00.000Z", phase: "new" },
        { date: "2024-03-13T12:00:00.000Z", phase: "waxing crescent" },
        { date: "2024-03-17T04:11:00.000Z", phase: "first quarter" },
        { date: "2024-03-21T12:00:00.000Z", phase: "waxing gibbous" },
        { date: "2024-03-25T07:00:00.000Z", phase: "full" },
        { date: "2024-03-28T12:00:00.000Z", phase: "waning gibbous" },
        { date: "2024-04-02T03:15:00.000Z", phase: "last quarter" },
        { date: "2024-04-05T12:00:00.000Z", phase: "waning crescent" },
      ];

      const events = phases.map(({ date, phase }) =>
        service.buildMonthlyLunarCycleEvent({
          date: moment.utc(date),
          lunarPhase: phase,
        }),
      );

      const progressiveEvents = service.detectProgressive(events);

      // Should have 7 progressive events (between 8 phases)
      expect(progressiveEvents).toHaveLength(7);
    });

    it("warns and skip events with invalid categories", () => {
      const invalidEvent: DetectedCalendarEvent = {
        categories: ["Monthly Lunar Cycle"], // Missing lunar phase category
        description: "Invalid",
        end: moment.utc("2024-03-10T09:00:00.000Z"),
        start: moment.utc("2024-03-10T09:00:00.000Z"),
        summary: "Invalid event",
      };
      const validEvent: DetectedCalendarEvent = {
        categories: [
          "Astronomy",
          "Astrology",
          "Monthly Lunar Cycle",
          "Lunar",
          "Waxing Crescent",
        ],
        description: "Waxing Crescent Moon",
        end: moment.utc("2024-03-13T12:00:00.000Z"),
        start: moment.utc("2024-03-13T12:00:00.000Z"),
        summary: "🌙 🌒 Waxing Crescent Moon",
      };

      const warnSpy = vi
        .spyOn(LoggerService.prototype, "warn")
        .mockReturnValue(undefined);

      const progressiveEvents = service.detectProgressive([
        invalidEvent,
        validEvent,
      ]);

      // Should skip the invalid event
      expect(progressiveEvents).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping progressive event"),
        undefined,
        expect.any(Object),
      );

      warnSpy.mockRestore();
    });
  });

  describe("private utility methods", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("returns null when progressive categories contain an unknown lunar phase", () => {
      const warnSpy = vi
        .spyOn(LoggerService.prototype, "warn")
        .mockReturnValue(undefined);

      const progressiveEvent = s.getMonthlyLunarCycleProgressiveEvent(
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Monthly Lunar Cycle",
            "Lunar",
            "Unknown",
          ],
          description: "Unknown Moon",
          end: moment.utc("2024-03-10T09:00:00.000Z"),
          start: moment.utc("2024-03-10T09:00:00.000Z"),
          summary: "Unknown Moon",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Monthly Lunar Cycle",
            "Lunar",
            "New",
          ],
          description: "New Moon",
          end: moment.utc("2024-03-13T12:00:00.000Z"),
          start: moment.utc("2024-03-13T12:00:00.000Z"),
          summary: "🌙 🌑 New Moon",
        },
      );

      expect(progressiveEvent).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping progressive event"),
        undefined,
        expect.any(Object),
      );

      warnSpy.mockRestore();
    });

    it("skips progressive pairing when sorted entries are sparse", () => {
      const orderedEventsSpy = vi.spyOn(_, "sortBy");

      orderedEventsSpy.mockReturnValue([
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Monthly Lunar Cycle",
            "Lunar",
            "New",
          ],
          description: "New Moon",
          end: moment.utc("2024-03-10T09:00:00.000Z"),
          start: moment.utc("2024-03-10T09:00:00.000Z"),
          summary: "🌙 🌑 New Moon",
        },
        undefined,
      ] as unknown);

      const progressiveEvents = service.detectProgressive([
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Monthly Lunar Cycle",
            "Lunar",
            "New",
          ],
          description: "New Moon",
          end: moment.utc("2024-03-10T09:00:00.000Z"),
          start: moment.utc("2024-03-10T09:00:00.000Z"),
          summary: "🌙 🌑 New Moon",
        },
      ]);

      expect(progressiveEvents).toStrictEqual([]);

      orderedEventsSpy.mockRestore();
    });

    describe("extractLunarPhaseFromCategories", () => {
      it("warns and return null when no lunar phase category is present", () => {
        const warnSpy = vi
          .spyOn(LoggerService.prototype, "warn")
          .mockReturnValue(undefined);

        const result = s.extractLunarPhaseFromCategories(
          ["Astronomy", "Astrology"],
          "Invalid event",
        );

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Skipping progressive event"),
          undefined,
          expect.any(Object),
        );

        warnSpy.mockRestore();
      });

      it("warns and return null when the lunar phase is invalid", () => {
        const warnSpy = vi
          .spyOn(LoggerService.prototype, "warn")
          .mockReturnValue(undefined);

        const result = s.extractLunarPhaseFromCategories(
          ["Astronomy", "Astrology", "Monthly Lunar Cycle", "Lunar", "Fake"],
          "Invalid event",
        );

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Skipping progressive event"),
          undefined,
          expect.any(Object),
        );

        warnSpy.mockRestore();
      });

      it("extracts a valid lunar phase category", () => {
        const result = s.extractLunarPhaseFromCategories(
          ["Astronomy", "Astrology", "Monthly Lunar Cycle", "Lunar", "New"],
          "Valid event",
        );

        expect(result).toBe("new");
      });

      it("warns and returns null when type guard rejects an otherwise recognized phase", () => {
        const warnSpy = vi
          .spyOn(LoggerService.prototype, "warn")
          .mockReturnValue(undefined);
        const lunarPhaseSpy = vi
          .spyOn(CaelundasTypes, "isLunarPhase")
          .mockReturnValue(false);

        const result = s.extractLunarPhaseFromCategories(
          ["Astronomy", "Astrology", "Monthly Lunar Cycle", "Lunar", "Full"],
          "Invalid typed event",
        );

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
          "🌙 Skipping unknown lunar phase",
          undefined,
          { lunarPhaseLower: "full" },
        );

        lunarPhaseSpy.mockRestore();
        warnSpy.mockRestore();
      });
    });

    describe("getMonthlyLunarCycleProgressiveEvent", () => {
      it("creates a progressive lunar cycle event for valid lunar phases", () => {
        const entering = {
          categories: [
            "Astronomy",
            "Astrology",
            "Monthly Lunar Cycle",
            "Lunar",
            "New",
          ],
          description: "New Moon",
          end: moment.utc("2024-01-01T00:00:00.000Z"),
          start: moment.utc("2024-01-01T00:00:00.000Z"),
          summary: "🌑 New Moon",
        } as DetectedCalendarEvent;
        const exiting = {
          ...entering,
          end: moment.utc("2024-01-08T00:00:00.000Z"),
          start: moment.utc("2024-01-08T00:00:00.000Z"),
          summary: "🌒 Waxing Crescent",
        };

        const result = s.getMonthlyLunarCycleProgressiveEvent(
          entering,
          exiting,
        );

        expect(result).toBeDefined();
        expect(result?.categories).toContain("Monthly Lunar Cycle");
        expect(result?.categories).toContain("New");
      });

      it("returns null when the entering event is missing a lunar phase category", () => {
        const internals = s as unknown as {
          extractLunarPhaseFromCategories: (
            categories: string[],
            enteringSummary: string,
          ) => null;
        };

        expect(
          internals.extractLunarPhaseFromCategories(
            ["Astronomy", "Astrology", "Monthly Lunar Cycle", "Lunar"],
            "Missing phase",
          ),
        ).toBeNull();
      });

      it("returns null when the lunar phase category is missing", () => {
        const internals = s as unknown as {
          extractLunarPhaseFromCategories: (
            categories: string[],
            enteringSummary: string,
          ) => null;
        };

        expect(
          internals.extractLunarPhaseFromCategories(
            ["Astronomy", "Astrology", "Monthly Lunar Cycle", "Lunar"],
            "Missing phase",
          ),
        ).toBeNull();
      });
    });

    describe("detectProgressive", () => {
      it("skips sparse entries when pairing monthly lunar events", () => {
        const sparseEvents = [] as DetectedCalendarEvent[];
        sparseEvents[1] = {
          categories: [
            "Astronomy",
            "Astrology",
            "Monthly Lunar Cycle",
            "Lunar",
            "New",
          ],
          description: "New Moon",
          end: moment.utc("2024-01-01T00:00:00.000Z"),
          start: moment.utc("2024-01-01T00:00:00.000Z"),
          summary: "🌑 New Moon",
        };

        expect(s.detectProgressive(sparseEvents)).toHaveLength(0);
      });
    });
  }); // private utility methods
});
