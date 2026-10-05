import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { AnnualSolarCycleEventsService } from "./annual-solar-cycle-events.service";
import { AnnualSolarCycleService } from "./annual-solar-cycle.service";

import type { Event } from "../calendar/calendar.types";
import type {
  CoordinateEphemeris,
  DistanceEphemeris,
} from "../ephemeris/ephemeris.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(AnnualSolarCycleService, () => {
  let service: AnnualSolarCycleService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        AnnualSolarCycleService,
        AnnualSolarCycleEventsService,
        MathService,
        ProgressiveUtilitiesService,
      ],
    }).compile();
    service = await module.resolve(AnnualSolarCycleService);
  });

  function createCoordinateEphemeris(
    currentMinute: Moment,
    longitudes: number[],
  ): CoordinateEphemeris {
    const ephemeris: CoordinateEphemeris = {};
    const totalMinutes = MARGIN_MINUTES * 2 + 1;

    for (let index = 0; index < totalMinutes; index++) {
      const minute = currentMinute
        .clone()
        .subtract(MARGIN_MINUTES - index, "minutes");
      const longitude = longitudes[index] ?? longitudes.at(-1) ?? 0;
      ephemeris[minute.toISOString()] = {
        latitude: 0,
        longitude,
      };
    }

    return ephemeris;
  }

  function createDistanceEphemeris(
    currentMinute: Moment,
    distances: number[],
  ): DistanceEphemeris {
    const ephemeris: DistanceEphemeris = {};
    const totalMinutes = MARGIN_MINUTES * 2 + 1;

    for (let index = 0; index < totalMinutes; index++) {
      const minute = currentMinute
        .clone()
        .subtract(MARGIN_MINUTES - index, "minutes");
      const distance = distances[index] ?? distances.at(-1) ?? 0;
      ephemeris[minute.toISOString()] = {
        distance,
      };
    }

    return ephemeris;
  }

  describe("getAnnualSolarCycleEvents/getSolarApsisEvents", () => {
    it("returns empty array when no annual solar cycle events occur", () => {
      const currentMinute = moment.utc("2024-03-15T12:00:00.000Z");

      // No event: sun at some random longitude
      const longitudes = Array.from<number>({
        length: MARGIN_MINUTES * 2 + 1,
      }).fill(10);

      const sunCoordinateEphemeris = createCoordinateEphemeris(
        currentMinute,
        longitudes,
      );

      const events = service.getAnnualSolarCycleEvents({
        minute: currentMinute,
        sunCoordinateEphemeris,
      });

      expect(events).toHaveLength(0);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSolarApsisEvents", () => {
    it("detects aphelion when distance is at maximum", () => {
      const currentMinute = moment.utc("2024-07-05T12:00:00.000Z");

      // Distance increasing then decreasing (maximum at current)
      const distances: number[] = [];
      for (let index = 0; index < MARGIN_MINUTES; index++) {
        distances.push(1.016 + index * 0.000_001);
      }
      distances.push(1.0167); // Current (maximum)
      for (let index = 0; index < MARGIN_MINUTES; index++) {
        distances.push(1.0167 - (index + 1) * 0.000_001);
      }

      const sunDistanceEphemeris = createDistanceEphemeris(
        currentMinute,
        distances,
      );

      const events = service.getSolarApsisEvents({
        minute: currentMinute,
        sunDistanceEphemeris,
      });

      expect(events.length).toBeGreaterThanOrEqual(1);

      const aphelionEvent = events.find((e) =>
        e.description.includes("Aphelion"),
      );

      expect(aphelionEvent).toStrictEqual(
        expect.objectContaining({ summary: "☀️ ❄️ Solar Aphelion" }),
      );
    });

    it("detects perihelion when distance is at minimum", () => {
      const currentMinute = moment.utc("2024-01-03T12:00:00.000Z");

      // Distance decreasing then increasing (minimum at current)
      const distances: number[] = [];
      for (let index = 0; index < MARGIN_MINUTES; index++) {
        distances.push(0.9833 - index * 0.000_001);
      }
      distances.push(0.9832); // Current (minimum)
      for (let index = 0; index < MARGIN_MINUTES; index++) {
        distances.push(0.9832 + (index + 1) * 0.000_001);
      }

      const sunDistanceEphemeris = createDistanceEphemeris(
        currentMinute,
        distances,
      );

      const events = service.getSolarApsisEvents({
        minute: currentMinute,
        sunDistanceEphemeris,
      });

      expect(events.length).toBeGreaterThanOrEqual(1);

      const perihelionEvent = events.find((e) =>
        e.description.includes("Perihelion"),
      );

      expect(perihelionEvent).toStrictEqual(
        expect.objectContaining({ summary: "☀️ 🔥 Solar Perihelion" }),
      );
    });

    it("returns empty array when no apsis events occur", () => {
      const currentMinute = moment.utc("2024-04-15T12:00:00.000Z");

      // Distance constantly increasing (no extrema)
      const distances: number[] = [];
      for (let index = 0; index < MARGIN_MINUTES * 2 + 1; index++) {
        distances.push(1 + index * 0.000_001);
      }

      const sunDistanceEphemeris = createDistanceEphemeris(
        currentMinute,
        distances,
      );

      const events = service.getSolarApsisEvents({
        minute: currentMinute,
        sunDistanceEphemeris,
      });

      expect(events).toHaveLength(0);
    });
  });

  describe("detectProgressive", () => {
    it("creates advancing progressive event from aphelion to perihelion", () => {
      const aphelionEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          "Aphelion",
        ],
        description: "Solar Aphelion",
        end: moment.utc("2024-07-05T12:00:00.000Z"),
        start: moment.utc("2024-07-05T12:00:00.000Z"),
        summary: "☀️ ❄️ Solar Aphelion",
      };
      const perihelionEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          "Perihelion",
        ],
        description: "Solar Perihelion",
        end: moment.utc("2025-01-03T12:00:00.000Z"),
        start: moment.utc("2025-01-03T12:00:00.000Z"),
        summary: "☀️ 🔥 Solar Perihelion",
      };

      const progressiveEvents: Event[] = service.detectProgressive([
        aphelionEvent,
        perihelionEvent,
      ]);

      expect(progressiveEvents.length).toBeGreaterThanOrEqual(1);

      const advancingDuration = progressiveEvents.find((e) =>
        e.description.includes("Advancing"),
      );

      expect(advancingDuration).toStrictEqual(
        expect.objectContaining({
          categories: [
            "Astronomy",
            "Astrology",
            "Annual Solar Cycle",
            "Solar",
            "Advancing",
          ],
          description: "Solar Advancing (Aphelion to Perihelion)",
          end: perihelionEvent.start,
          start: aphelionEvent.start,
          summary: "☀️ 🔥 Solar Advancing",
        }),
      );
    });

    it("creates retreating progressive event from perihelion to aphelion", () => {
      const perihelionEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          "Perihelion",
        ],
        description: "Solar Perihelion",
        end: moment.utc("2024-01-03T12:00:00.000Z"),
        start: moment.utc("2024-01-03T12:00:00.000Z"),
        summary: "☀️ 🔥 Solar Perihelion",
      };
      const aphelionEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          "Aphelion",
        ],
        description: "Solar Aphelion",
        end: moment.utc("2024-07-05T12:00:00.000Z"),
        start: moment.utc("2024-07-05T12:00:00.000Z"),
        summary: "☀️ ❄️ Solar Aphelion",
      };

      const progressiveEvents: Event[] = service.detectProgressive([
        perihelionEvent,
        aphelionEvent,
      ]);

      expect(progressiveEvents.length).toBeGreaterThanOrEqual(1);

      const retreatingDuration = progressiveEvents.find((e) =>
        e.description.includes("Retreating"),
      );

      expect(retreatingDuration).toStrictEqual(
        expect.objectContaining({
          categories: [
            "Astronomy",
            "Astrology",
            "Annual Solar Cycle",
            "Solar",
            "Retreating",
          ],
          description: "Solar Retreating (Perihelion to Aphelion)",
          end: aphelionEvent.start,
          start: perihelionEvent.start,
          summary: "☀️ ❄️ Solar Retreating",
        }),
      );
    });

    it("returns empty array when no apsis events provided", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("handles full year cycle with both advancing and retreating", () => {
      const perihelion1: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          "Perihelion",
        ],
        description: "Solar Perihelion",
        end: moment.utc("2024-01-03T12:00:00.000Z"),
        start: moment.utc("2024-01-03T12:00:00.000Z"),
        summary: "☀️ 🔥 Solar Perihelion",
      };
      const aphelion: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          "Aphelion",
        ],
        description: "Solar Aphelion",
        end: moment.utc("2024-07-05T12:00:00.000Z"),
        start: moment.utc("2024-07-05T12:00:00.000Z"),
        summary: "☀️ ❄️ Solar Aphelion",
      };
      const perihelion2: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          "Perihelion",
        ],
        description: "Solar Perihelion",
        end: moment.utc("2025-01-03T12:00:00.000Z"),
        start: moment.utc("2025-01-03T12:00:00.000Z"),
        summary: "☀️ 🔥 Solar Perihelion",
      };

      const progressiveEvents = service.detectProgressive([
        perihelion1,
        aphelion,
        perihelion2,
      ]);

      // Should have both retreating (peri→aph) and advancing (aph→peri)
      expect(progressiveEvents.length).toBeGreaterThanOrEqual(2);

      const retreating = progressiveEvents.find((e) =>
        e.description.includes("Retreating"),
      );
      const advancing = progressiveEvents.find((e) =>
        e.description.includes("Advancing"),
      );

      expect(retreating).toBeDefined();
      expect(advancing).toBeDefined();
    });

    it("filters out non-annual solar cycle events", () => {
      const nonApsisEvent: Event = {
        categories: ["Astronomy", "Something Else"],
        description: "Not an apsis event",
        end: moment.utc("2024-01-03T12:00:00.000Z"),
        start: moment.utc("2024-01-03T12:00:00.000Z"),
        summary: "Some other event",
      };

      const progressiveEvents = service.detectProgressive([nonApsisEvent]);

      expect(progressiveEvents).toHaveLength(0);
    });
  });
});
