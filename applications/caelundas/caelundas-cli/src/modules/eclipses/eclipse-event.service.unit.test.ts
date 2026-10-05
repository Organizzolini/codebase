import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { EclipseEventService } from "./eclipse-event.service";

import type { Event } from "../calendar/calendar.types";

describe(EclipseEventService, () => {
  let service: EclipseEventService;
  let progressiveUtilitiesService: ProgressiveUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseEventService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: ProgressiveUtilitiesService,
          useValue: createMock<ProgressiveUtilitiesService>(),
        },
      ],
    }).compile();

    service = await module.resolve(EclipseEventService);
    await module.resolve(LoggerService);
    progressiveUtilitiesService = await module.resolve(
      ProgressiveUtilitiesService,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildSolarEclipseEvent", () => {
    it("builds geocentric solar eclipse event", () => {
      const timestamp = moment.utc("2024-04-08T18:00:00.000Z");

      const event = service.buildSolarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "beginning",
      });

      expect(event.summary).toBe("🌐 ☀️🐉▶️ Solar Eclipse begins");
      expect(event.description).toBe("Solar Eclipse begins (Geocentric)");
      expect(event.categories).toContain("Solar");
      expect(event.categories).toContain("Geocentric");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
    });

    it("builds topocentric solar eclipse event", () => {
      const timestamp = moment.utc("2024-04-08T18:00:00.000Z");

      const event = service.buildSolarEclipseEvent({
        date: timestamp,
        frame: "topocentric",
        phase: "beginning",
      });

      expect(event.summary).toBe("📍 ☀️🐉▶️ Solar Eclipse begins");
      expect(event.description).toBe(
        "Solar Eclipse begins (Topocentric Visibility)",
      );
      expect(event.categories).toContain("Topocentric Visibility");
    });

    it("builds maximum and ending solar eclipse events", () => {
      const timestamp = moment.utc("2024-04-08T18:00:00.000Z");

      const maximumEvent = service.buildSolarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "maximum",
      });
      const endingEvent = service.buildSolarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "ending",
      });

      expect(maximumEvent.summary).toContain("Solar Eclipse maximum");
      expect(endingEvent.summary).toContain("Solar Eclipse ends");
    });
  });

  describe("buildLunarEclipseEvent", () => {
    it("builds geocentric lunar eclipse event", () => {
      const timestamp = moment.utc("2024-09-18T02:00:00.000Z");

      const event = service.buildLunarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "beginning",
      });

      expect(event.summary).toBe("🌐 🌙🐉▶️ Lunar Eclipse begins");
      expect(event.description).toBe("Lunar Eclipse begins (Geocentric)");
      expect(event.categories).toContain("Lunar");
      expect(event.categories).toContain("Geocentric");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
    });

    it("builds topocentric lunar eclipse event", () => {
      const timestamp = moment.utc("2024-09-18T02:00:00.000Z");

      const event = service.buildLunarEclipseEvent({
        date: timestamp,
        frame: "topocentric",
        phase: "beginning",
      });

      expect(event.summary).toBe("📍 🌙🐉▶️ Lunar Eclipse begins");
      expect(event.description).toBe(
        "Lunar Eclipse begins (Topocentric Visibility)",
      );
      expect(event.categories).toContain("Topocentric Visibility");
    });

    it("builds maximum and ending lunar eclipse events", () => {
      const timestamp = moment.utc("2024-09-18T02:00:00.000Z");

      const maximumEvent = service.buildLunarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "maximum",
      });
      const endingEvent = service.buildLunarEclipseEvent({
        date: timestamp,
        frame: "geocentric",
        phase: "ending",
      });

      expect(maximumEvent.summary).toContain("Lunar Eclipse maximum");
      expect(endingEvent.summary).toContain("Lunar Eclipse ends");
    });
  });

  describe("detectProgressive", () => {
    it("creates progressive events for geocentric solar and lunar eclipse ranges", () => {
      const solarBeginning: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Solar",
          "Geocentric",
        ],
        description: "Solar Eclipse begins (Geocentric)",
        end: moment.utc("2024-04-08T18:00:00.000Z"),
        start: moment.utc("2024-04-08T18:00:00.000Z"),
        summary: "🌐 ☀️🐉▶️ Solar Eclipse begins",
      };
      const solarEnding: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Solar",
          "Geocentric",
        ],
        description: "Solar Eclipse ends (Geocentric)",
        end: moment.utc("2024-04-08T19:00:00.000Z"),
        start: moment.utc("2024-04-08T19:00:00.000Z"),
        summary: "🌐 ☀️🐉◀️ Solar Eclipse ends",
      };
      const lunarBeginning: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Lunar",
          "Geocentric",
        ],
        description: "Lunar Eclipse begins (Geocentric)",
        end: moment.utc("2024-09-18T02:00:00.000Z"),
        start: moment.utc("2024-09-18T02:00:00.000Z"),
        summary: "🌐 🌙🐉▶️ Lunar Eclipse begins",
      };
      const lunarEnding: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Lunar",
          "Geocentric",
        ],
        description: "Lunar Eclipse ends (Geocentric)",
        end: moment.utc("2024-09-18T03:00:00.000Z"),
        start: moment.utc("2024-09-18T03:00:00.000Z"),
        summary: "🌐 🌙🐉◀️ Lunar Eclipse ends",
      };

      vi.mocked(progressiveUtilitiesService.pairProgressiveEvents)
        .mockReturnValueOnce([[lunarBeginning, lunarEnding]])
        .mockReturnValueOnce([[solarBeginning, solarEnding]])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const progressiveEvents = service.detectProgressive([
        solarBeginning,
        solarEnding,
        lunarBeginning,
        lunarEnding,
      ]);

      expect(progressiveEvents).toHaveLength(2);

      const solarDurationEvent = progressiveEvents.find((event) =>
        event.categories.includes("Solar"),
      );
      const lunarDurationEvent = progressiveEvents.find((event) =>
        event.categories.includes("Lunar"),
      );

      expect(solarDurationEvent?.description).toBe(
        "Solar Eclipse (Geocentric)",
      );
      expect(solarDurationEvent?.summary).toBe(
        "🌐 ☀️🐉 Solar Eclipse (Geocentric)",
      );
      expect(lunarDurationEvent?.description).toBe(
        "Lunar Eclipse (Geocentric)",
      );
      expect(lunarDurationEvent?.summary).toBe(
        "🌐 🌙🐉 Lunar Eclipse (Geocentric)",
      );
    });

    it("returns empty array when no eclipse events exist", () => {
      vi.mocked(progressiveUtilitiesService.pairProgressiveEvents)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const result = service.detectProgressive([
        {
          categories: ["Astronomy"],
          description: "Unrelated",
          end: moment.utc("2024-01-01T00:00:00.000Z"),
          start: moment.utc("2024-01-01T00:00:00.000Z"),
          summary: "Unrelated",
        },
      ]);

      expect(result).toStrictEqual([]);
    });

    it("creates topocentric progressive events for solar and lunar eclipse ranges", () => {
      const solarBeginning: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Solar",
          "Topocentric Visibility",
        ],
        description: "Solar Eclipse begins (Topocentric Visibility)",
        end: moment.utc("2024-04-08T18:00:00.000Z"),
        start: moment.utc("2024-04-08T18:00:00.000Z"),
        summary: "📍 ☀️🐉▶️ Solar Eclipse begins",
      };
      const solarEnding: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Solar",
          "Topocentric Visibility",
        ],
        description: "Solar Eclipse ends (Topocentric Visibility)",
        end: moment.utc("2024-04-08T19:00:00.000Z"),
        start: moment.utc("2024-04-08T19:00:00.000Z"),
        summary: "📍 ☀️🐉◀️ Solar Eclipse ends",
      };
      const lunarBeginning: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Lunar",
          "Topocentric Visibility",
        ],
        description: "Lunar Eclipse begins (Topocentric Visibility)",
        end: moment.utc("2024-09-18T02:00:00.000Z"),
        start: moment.utc("2024-09-18T02:00:00.000Z"),
        summary: "📍 🌙🐉▶️ Lunar Eclipse begins",
      };
      const lunarEnding: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Eclipse",
          "Lunar",
          "Topocentric Visibility",
        ],
        description: "Lunar Eclipse ends (Topocentric Visibility)",
        end: moment.utc("2024-09-18T03:00:00.000Z"),
        start: moment.utc("2024-09-18T03:00:00.000Z"),
        summary: "📍 🌙🐉◀️ Lunar Eclipse ends",
      };

      vi.mocked(progressiveUtilitiesService.pairProgressiveEvents)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([[lunarBeginning, lunarEnding]])
        .mockReturnValueOnce([[solarBeginning, solarEnding]]);

      const progressiveEvents = service.detectProgressive([
        solarBeginning,
        solarEnding,
        lunarBeginning,
        lunarEnding,
      ]);

      expect(progressiveEvents).toHaveLength(2);

      const solarDurationEvent = progressiveEvents.find((event) =>
        event.categories.includes("Solar"),
      );
      const lunarDurationEvent = progressiveEvents.find((event) =>
        event.categories.includes("Lunar"),
      );

      expect(solarDurationEvent?.description).toBe(
        "Solar Eclipse (Topocentric Visibility)",
      );
      expect(solarDurationEvent?.summary).toBe(
        "📍 ☀️🐉 Solar Eclipse (Topocentric Visibility)",
      );
      expect(lunarDurationEvent?.description).toBe(
        "Lunar Eclipse (Topocentric Visibility)",
      );
      expect(lunarDurationEvent?.summary).toBe(
        "📍 🌙🐉 Lunar Eclipse (Topocentric Visibility)",
      );
    });
  });
});
