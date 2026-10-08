import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { AnnualSolarCycleEventsService } from "./annual-solar-cycle-events.service";
import { AnnualSolarCycleService } from "./annual-solar-cycle.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
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

  /**
   * Builds a distance ephemeris centered on `currentMinute`, one sample per
   * minute across the margin. Speeds default to zero when not given.
   */
  function createDistanceEphemeris(
    currentMinute: Moment,
    distances: number[],
    speeds: number[] = [],
  ): DistanceEphemeris {
    const ephemeris: DistanceEphemeris = {};
    const totalMinutes = MARGIN_MINUTES * 2 + 1;

    for (let index = 0; index < totalMinutes; index++) {
      const minute = currentMinute
        .clone()
        .subtract(MARGIN_MINUTES - index, "minutes");
      ephemeris[minute.toISOString()] = {
        distance: distances[index] ?? distances.at(-1) ?? 1,
        distanceSpeed: speeds[index] ?? speeds.at(-1) ?? 0,
      };
    }

    return ephemeris;
  }

  /** Runs the apsis detector at every minute of a window and returns what it found. */
  function detectAcrossWindow(
    centerMinute: Moment,
    ephemeris: DistanceEphemeris,
  ): DetectedCalendarEvent[] {
    const events: DetectedCalendarEvent[] = [];
    for (let offset = -MARGIN_MINUTES + 1; offset <= MARGIN_MINUTES; offset++) {
      events.push(
        ...service.getSolarApsisEvents({
          minute: centerMinute.clone().add(offset, "minutes"),
          sunDistanceEphemeris: ephemeris,
        }),
      );
    }
    return events;
  }

  /** Speeds that cross zero between the samples at `crossing - 1` and `crossing`. */
  function speedsCrossing(
    crossing: number,
    before: number,
    after: number,
  ): number[] {
    return Array.from({ length: MARGIN_MINUTES * 2 + 1 }, (_, index) =>
      index < crossing ? before : after,
    );
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
    it("detects perihelion when radial speed turns from negative to non-negative", () => {
      const currentMinute = moment.utc("2026-01-03T17:18:00.000Z");
      // Speed -3 at 17:17, +1 at 17:18: the nearer sample is 17:18.
      const sunDistanceEphemeris = createDistanceEphemeris(
        currentMinute,
        [1],
        speedsCrossing(MARGIN_MINUTES, -3, 1),
      );

      const events = service.getSolarApsisEvents({
        minute: currentMinute,
        sunDistanceEphemeris,
      });

      expect(events).toStrictEqual([
        expect.objectContaining({ summary: "☀️ 🔥 Solar Perihelion" }),
      ]);
      expect(events[0]?.start.toISOString()).toBe("2026-01-03T17:18:00.000Z");
    });

    it("stamps perihelion on the earlier minute when its speed is nearer zero", () => {
      const currentMinute = moment.utc("2026-01-03T17:18:00.000Z");
      const sunDistanceEphemeris = createDistanceEphemeris(
        currentMinute,
        [1],
        speedsCrossing(MARGIN_MINUTES, -1, 3),
      );

      const events = service.getSolarApsisEvents({
        minute: currentMinute,
        sunDistanceEphemeris,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.start.toISOString()).toBe("2026-01-03T17:17:00.000Z");
    });

    it("detects aphelion when radial speed turns from positive to non-positive", () => {
      const currentMinute = moment.utc("2026-07-06T17:31:00.000Z");
      // Speed +1 at 17:30, -3 at 17:31: the nearer sample is 17:30.
      const sunDistanceEphemeris = createDistanceEphemeris(
        currentMinute,
        [1],
        speedsCrossing(MARGIN_MINUTES, 1, -3),
      );

      const events = service.getSolarApsisEvents({
        minute: currentMinute,
        sunDistanceEphemeris,
      });

      expect(events).toStrictEqual([
        expect.objectContaining({ summary: "☀️ ❄️ Solar Aphelion" }),
      ]);
      expect(events[0]?.start.toISOString()).toBe("2026-07-06T17:30:00.000Z");
    });

    it("reports one perihelion at the true minute through persisting and repeated distance steps", () => {
      const centerMinute = moment.utc("2026-01-03T17:18:00.000Z");
      const length = MARGIN_MINUTES * 2 + 1;
      // True apsis between samples 29 and 30: speed rises smoothly through zero.
      const speeds = Array.from(
        { length },
        (_, index) => (index - 29.4) * 1e-9,
      );
      // Distance follows its smooth parabola, then a downward step that
      // persists and an upward step eight samples later (light-time shape).
      const stepSize = 3e-9;
      const distances = Array.from({ length }, (_, index) => {
        const smooth = 1 + (index - 29.4) * (index - 29.4) * 1e-12;
        const downStep = index >= 12 ? -stepSize : 0;
        const upStep = index >= 20 ? stepSize : 0;
        return smooth + downStep + upStep;
      });
      const sunDistanceEphemeris = createDistanceEphemeris(
        centerMinute,
        distances,
        speeds,
      );

      const events = detectAcrossWindow(centerMinute, sunDistanceEphemeris);

      expect(events).toHaveLength(1);
      expect(events[0]).toStrictEqual(
        expect.objectContaining({ summary: "☀️ 🔥 Solar Perihelion" }),
      );
      // Sample 29 is |-0.4|, sample 30 is |0.6|: nearest minute is sample 29.
      expect(events[0]?.start.toISOString()).toBe("2026-01-03T17:17:00.000Z");
    });

    it("reports a perihelion once when speed sits on zero for several minutes", () => {
      const centerMinute = moment.utc("2026-01-03T17:18:00.000Z");
      const speeds = Array.from(
        { length: MARGIN_MINUTES * 2 + 1 },
        (_, index) => {
          if (index < MARGIN_MINUTES) return -1;
          if (index < MARGIN_MINUTES + 3) return 0;
          return 1;
        },
      );
      const sunDistanceEphemeris = createDistanceEphemeris(
        centerMinute,
        [1],
        speeds,
      );

      const events = detectAcrossWindow(centerMinute, sunDistanceEphemeris);

      expect(events).toHaveLength(1);
      expect(events[0]).toStrictEqual(
        expect.objectContaining({ summary: "☀️ 🔥 Solar Perihelion" }),
      );
    });

    it("reports an aphelion once when speed sits on zero for several minutes", () => {
      const centerMinute = moment.utc("2026-07-06T17:30:00.000Z");
      const speeds = Array.from(
        { length: MARGIN_MINUTES * 2 + 1 },
        (_, index) => {
          if (index < MARGIN_MINUTES) return 1;
          if (index < MARGIN_MINUTES + 3) return 0;
          return -1;
        },
      );
      const sunDistanceEphemeris = createDistanceEphemeris(
        centerMinute,
        [1],
        speeds,
      );

      const events = detectAcrossWindow(centerMinute, sunDistanceEphemeris);

      expect(events).toHaveLength(1);
      expect(events[0]).toStrictEqual(
        expect.objectContaining({ summary: "☀️ ❄️ Solar Aphelion" }),
      );
    });

    it("ignores distance wiggles while the radial speed keeps its sign", () => {
      const currentMinute = moment.utc("2026-04-15T12:00:00.000Z");
      const distances = Array.from(
        { length: MARGIN_MINUTES * 2 + 1 },
        (_, index) => (index % 2 === 0 ? 1 : 1.000_001),
      );
      const sunDistanceEphemeris = createDistanceEphemeris(
        currentMinute,
        distances,
        [1e-6],
      );

      const events = detectAcrossWindow(currentMinute, sunDistanceEphemeris);

      expect(events).toHaveLength(0);
    });
  });

  describe("detectProgressive", () => {
    it("creates advancing progressive event from aphelion to perihelion", () => {
      const aphelionEvent: DetectedCalendarEvent = {
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
      const perihelionEvent: DetectedCalendarEvent = {
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

      const progressiveEvents: DetectedCalendarEvent[] =
        service.detectProgressive([aphelionEvent, perihelionEvent]);

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
      const perihelionEvent: DetectedCalendarEvent = {
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
      const aphelionEvent: DetectedCalendarEvent = {
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

      const progressiveEvents: DetectedCalendarEvent[] =
        service.detectProgressive([perihelionEvent, aphelionEvent]);

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

    it("never yields a span that ends before it starts", () => {
      const apsis = (
        kind: "Aphelion" | "Perihelion",
        at: string,
      ): DetectedCalendarEvent => ({
        categories: [
          "Astronomy",
          "Astrology",
          "Annual Solar Cycle",
          "Solar",
          kind,
        ],
        description: `Solar ${kind}`,
        end: moment.utc(at),
        start: moment.utc(at),
        summary:
          kind === "Perihelion"
            ? "☀️ 🔥 Solar Perihelion"
            : "☀️ ❄️ Solar Aphelion",
      });
      // The old duplicate-perihelion pattern, then a correct year.
      const events: DetectedCalendarEvent[] = [
        apsis("Perihelion", "2026-01-03T17:17:00.000Z"),
        apsis("Aphelion", "2026-01-03T18:09:00.000Z"),
        apsis("Perihelion", "2026-01-03T18:10:00.000Z"),
        apsis("Aphelion", "2026-07-06T17:30:00.000Z"),
        apsis("Perihelion", "2027-01-03T02:30:00.000Z"),
      ];

      const spans = service.detectProgressive(events);

      expect(spans.length).toBeGreaterThan(0);

      for (const span of spans) {
        expect(span.end.valueOf()).toBeGreaterThanOrEqual(span.start.valueOf());
      }
    });

    it("returns empty array when no apsis events provided", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("handles full year cycle with both advancing and retreating", () => {
      const perihelion1: DetectedCalendarEvent = {
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
      const aphelion: DetectedCalendarEvent = {
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
      const perihelion2: DetectedCalendarEvent = {
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
      const nonApsisEvent: DetectedCalendarEvent = {
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
