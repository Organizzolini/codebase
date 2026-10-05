import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { RetrogradesService } from "./retrogrades.service";

import type { RetrogradeBody } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(RetrogradesService, () => {
  let service: RetrogradesService;
  let s: ServicePrivate;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        RetrogradesService,
        MathService,
        ProgressiveUtilitiesService,
      ],
    }).compile();
    service = await module.resolve(RetrogradesService);
    s = service as unknown as ServicePrivate;
  });

  // Helper to create ephemeris data with margin
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

  describe("detect", () => {
    it("detects retrograde station when longitude starts decreasing", () => {
      const currentMinute = moment.utc("2024-04-01T12:00:00.000Z");

      // Mercury slowing down and then going retrograde
      // Longitudes increasing slower then decreasing (retrograde)
      const longitudes: number[] = [];
      for (let index = 0; index < MARGIN_MINUTES; index++) {
        // Previous: increasing toward maximum
        longitudes.push(100 + index * 0.001);
      }
      longitudes.push(100 + MARGIN_MINUTES * 0.001); // Current at peak
      for (let index = 0; index < MARGIN_MINUTES; index++) {
        // Next: decreasing (retrograde)
        longitudes.push(100 + MARGIN_MINUTES * 0.001 - (index + 1) * 0.001);
      }

      const mercuryEphemeris = createCoordinateEphemeris(
        currentMinute,
        longitudes,
      );

      // Create empty ephemeris for other bodies
      const emptyEphemeris: CoordinateEphemeris = {};
      for (let index = -MARGIN_MINUTES; index <= MARGIN_MINUTES; index++) {
        const minute = currentMinute.clone().add(index, "minutes");
        emptyEphemeris[minute.toISOString()] = { latitude: 0, longitude: 0 };
      }

      const coordinateEphemerisByBody: Record<
        RetrogradeBody,
        CoordinateEphemeris
      > = {
        ceres: emptyEphemeris,
        chiron: emptyEphemeris,
        juno: emptyEphemeris,
        jupiter: emptyEphemeris,
        lilith: emptyEphemeris,
        mars: emptyEphemeris,
        mercury: mercuryEphemeris,
        neptune: emptyEphemeris,
        pallas: emptyEphemeris,
        pluto: emptyEphemeris,
        saturn: emptyEphemeris,
        uranus: emptyEphemeris,
        venus: emptyEphemeris,
        vesta: emptyEphemeris,
      };

      const events = service.detect({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      const mercuryRetrograde = events.find(
        (e) =>
          e.description.includes("Mercury") &&
          e.description.includes("Retrograde"),
      );

      expect(mercuryRetrograde).toBeDefined();
    });

    it("returns empty array when no retrograde events occur", () => {
      const currentMinute = moment.utc("2024-04-01T12:00:00.000Z");

      // All planets moving direct (increasing longitude)
      const directLongitudes: number[] = [];
      for (let index = 0; index < MARGIN_MINUTES * 2 + 1; index++) {
        directLongitudes.push(100 + index * 0.01);
      }

      const directEphemeris = createCoordinateEphemeris(
        currentMinute,
        directLongitudes,
      );

      const coordinateEphemerisByBody: Record<
        RetrogradeBody,
        CoordinateEphemeris
      > = {
        ceres: directEphemeris,
        chiron: directEphemeris,
        juno: directEphemeris,
        jupiter: directEphemeris,
        lilith: directEphemeris,
        mars: directEphemeris,
        mercury: directEphemeris,
        neptune: directEphemeris,
        pallas: directEphemeris,
        pluto: directEphemeris,
        saturn: directEphemeris,
        uranus: directEphemeris,
        venus: directEphemeris,
        vesta: directEphemeris,
      };

      const events = service.detect({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(0);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getRetrogradeEvent", () => {
    it("creates a retrograde event with correct structure", () => {
      const timestamp = moment.utc("2024-04-01T12:00:00.000Z");

      const event = service.buildRetrogradeEvent({
        body: "mercury",
        direction: "retrograde",
        timestamp,
      });

      expect(event.summary).toBe("☿ ↩️ Mercury Stationary Retrograde");
      expect(event.description).toBe("Mercury Stationary Retrograde");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
      expect(event.categories).toContain("Astronomy");
      expect(event.categories).toContain("Astrology");
      expect(event.categories).toContain("Direction");
      expect(event.categories).toContain("Retrograde");
    });

    it("creates a direct event with correct structure", () => {
      const timestamp = moment.utc("2024-04-25T12:00:00.000Z");

      const event = service.buildRetrogradeEvent({
        body: "mercury",
        direction: "direct",
        timestamp,
      });

      expect(event.summary).toBe("☿ ↪️ Mercury Stationary Direct");
      expect(event.description).toBe("Mercury Stationary Direct");
      expect(event.categories).toContain("Direct");
      expect(event.categories).not.toContain("Retrograde");
    });

    it("uses correct symbol for Venus", () => {
      const timestamp = moment.utc("2024-07-22T12:00:00.000Z");

      const event = service.buildRetrogradeEvent({
        body: "venus",
        direction: "retrograde",
        timestamp,
      });

      expect(event.summary).toBe("♀️ ↩️ Venus Stationary Retrograde");
    });

    it("uses correct symbol for Mars", () => {
      const timestamp = moment.utc("2024-12-06T12:00:00.000Z");

      const event = service.buildRetrogradeEvent({
        body: "mars",
        direction: "retrograde",
        timestamp,
      });

      expect(event.summary).toBe("♂️ ↩️ Mars Stationary Retrograde");
    });

    it("uses correct symbol for Jupiter", () => {
      const timestamp = moment.utc("2024-10-09T12:00:00.000Z");

      const event = service.buildRetrogradeEvent({
        body: "jupiter",
        direction: "retrograde",
        timestamp,
      });

      expect(event.summary).toBe("♃ ↩️ Jupiter Stationary Retrograde");
    });

    it("uses correct symbol for Saturn", () => {
      const timestamp = moment.utc("2024-06-29T12:00:00.000Z");

      const event = service.buildRetrogradeEvent({
        body: "saturn",
        direction: "retrograde",
        timestamp,
      });

      expect(event.summary).toBe("♄ ↩️ Saturn Stationary Retrograde");
    });
  });

  describe("detectProgressive", () => {
    it("creates progressive event from retrograde to direct", () => {
      const retrogradeEvent: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Retrograde"],
        description: "Mercury Stationary Retrograde",
        end: moment.utc("2024-04-01T12:00:00.000Z"),
        start: moment.utc("2024-04-01T12:00:00.000Z"),
        summary: "☿ ↩️ Mercury Stationary Retrograde",
      };
      const directEvent: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Direct"],
        description: "Mercury Stationary Direct",
        end: moment.utc("2024-04-25T12:00:00.000Z"),
        start: moment.utc("2024-04-25T12:00:00.000Z"),
        summary: "☿ ↪️ Mercury Stationary Direct",
      };

      const progressiveEvents = service.detectProgressive([
        retrogradeEvent,
        directEvent,
      ]);

      // Should create progressive events for each planet that has retrograde/direct pairs
      expect(progressiveEvents.length).toBeGreaterThanOrEqual(1);

      const mercuryDuration = progressiveEvents.find(
        (e) =>
          e.description.includes("Mercury") &&
          e.description.includes("Retrograde"),
      );

      expect(mercuryDuration).toStrictEqual(
        expect.objectContaining({
          end: directEvent.start,
          start: retrogradeEvent.start,
        }),
      );
      expect(mercuryDuration?.summary).toContain("Retrograde");
    });

    it("omits the symbol when the source summary is empty", () => {
      const internals = service as unknown as {
        getRetrogradeProgressiveEvent: (
          beginningEvent: Event,
          endingEvent: Event,
          planet: "mercury",
        ) => Event;
      };
      const beginningEvent: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Retrograde"],
        description: "Mercury Stationary Retrograde",
        end: moment.utc("2024-04-01T12:00:00.000Z"),
        start: moment.utc("2024-04-01T12:00:00.000Z"),
        summary: "",
      };
      const endingEvent: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Direct"],
        description: "Mercury Stationary Direct",
        end: moment.utc("2024-04-25T12:00:00.000Z"),
        start: moment.utc("2024-04-25T12:00:00.000Z"),
        summary: "☿ ↪️ Mercury Stationary Direct",
      };

      expect(
        internals.getRetrogradeProgressiveEvent(
          beginningEvent,
          endingEvent,
          "mercury",
        ).summary,
      ).toBe(" ↩️ Mercury Retrograde");
    });

    it("returns empty array when no direction events provided", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("handles multiple planets retrograde periods", () => {
      const mercuryRetrograde: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Retrograde"],
        description: "Mercury Stationary Retrograde",
        end: moment.utc("2024-04-01T12:00:00.000Z"),
        start: moment.utc("2024-04-01T12:00:00.000Z"),
        summary: "☿ ↩️ Mercury Stationary Retrograde",
      };
      const mercuryDirect: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Direct"],
        description: "Mercury Stationary Direct",
        end: moment.utc("2024-04-25T12:00:00.000Z"),
        start: moment.utc("2024-04-25T12:00:00.000Z"),
        summary: "☿ ↪️ Mercury Stationary Direct",
      };
      const venusRetrograde: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Retrograde"],
        description: "Venus Stationary Retrograde",
        end: moment.utc("2024-07-22T12:00:00.000Z"),
        start: moment.utc("2024-07-22T12:00:00.000Z"),
        summary: "♀️ ↩️ Venus Stationary Retrograde",
      };
      const venusDirect: Event = {
        categories: ["Astronomy", "Astrology", "Direction", "Direct"],
        description: "Venus Stationary Direct",
        end: moment.utc("2024-09-03T12:00:00.000Z"),
        start: moment.utc("2024-09-03T12:00:00.000Z"),
        summary: "♀️ ↪️ Venus Stationary Direct",
      };

      const progressiveEvents = service.detectProgressive([
        mercuryRetrograde,
        mercuryDirect,
        venusRetrograde,
        venusDirect,
      ]);

      // Should have progressive events for both Mercury and Venus
      expect(progressiveEvents.length).toBeGreaterThanOrEqual(2);
    });
  });

  interface ServicePrivate {
    isDirect: (args: {
      currentLongitude: number;
      nextLongitudes: number[];
      previousLongitudes: number[];
    }) => boolean;
    isRetrograde: (args: {
      currentLongitude: number;
      nextLongitudes: number[];
      previousLongitudes: number[];
    }) => boolean;
  }

  describe("isRetrograde", () => {
    it("returns true when planet stations retrograde", () => {
      const result = s.isRetrograde({
        currentLongitude: 100,
        nextLongitudes: [100, 99], // Will be same or decreasing (retrograde)
        previousLongitudes: [98, 99], // Was increasing (direct motion)
      });

      expect(result).toBe(true);
    });

    it("returns false when planet continues direct motion", () => {
      const result = s.isRetrograde({
        currentLongitude: 100,
        nextLongitudes: [101, 102],
        previousLongitudes: [98, 99],
      });

      expect(result).toBe(false);
    });

    it("returns false when planet is already retrograde", () => {
      const result = s.isRetrograde({
        currentLongitude: 100,
        nextLongitudes: [99, 98],
        previousLongitudes: [102, 101], // Was decreasing (already retrograde)
      });

      expect(result).toBe(false);
    });

    it("handles 0/360 boundary crossing correctly", () => {
      const result = s.isRetrograde({
        currentLongitude: 5,
        nextLongitudes: [5, 4], // Will be retrograde
        previousLongitudes: [358, 360], // Effectively 358, 0 - was direct
      });

      expect(result).toBe(true);
    });

    it("returns false when not all previous longitudes indicate direct motion", () => {
      const result = s.isRetrograde({
        currentLongitude: 100,
        nextLongitudes: [100, 99],
        previousLongitudes: [101, 99], // Mixed - not all direct
      });

      expect(result).toBe(false);
    });

    it("returns false when not all next longitudes indicate retrograde", () => {
      const result = s.isRetrograde({
        currentLongitude: 100,
        nextLongitudes: [99, 101], // Mixed - not all retrograde
        previousLongitudes: [98, 99],
      });

      expect(result).toBe(false);
    });
  });

  describe("isDirect", () => {
    it("returns true when planet stations direct", () => {
      const result = s.isDirect({
        currentLongitude: 100,
        nextLongitudes: [100, 101], // Will be same or increasing (direct)
        previousLongitudes: [102, 101], // Was decreasing (retrograde motion)
      });

      expect(result).toBe(true);
    });

    it("returns false when planet continues retrograde motion", () => {
      const result = s.isDirect({
        currentLongitude: 100,
        nextLongitudes: [99, 98],
        previousLongitudes: [102, 101],
      });

      expect(result).toBe(false);
    });

    it("returns false when planet is already direct", () => {
      const result = s.isDirect({
        currentLongitude: 100,
        nextLongitudes: [101, 102],
        previousLongitudes: [98, 99], // Was increasing (already direct)
      });

      expect(result).toBe(false);
    });

    it("handles 0/360 boundary crossing correctly", () => {
      const result = s.isDirect({
        currentLongitude: 355,
        nextLongitudes: [355, 356], // Will be direct
        previousLongitudes: [358, 357], // Was retrograde
      });

      expect(result).toBe(true);
    });

    it("returns false when not all previous longitudes indicate retrograde motion", () => {
      const result = s.isDirect({
        currentLongitude: 100,
        nextLongitudes: [100, 101],
        previousLongitudes: [99, 101], // Mixed - not all retrograde
      });

      expect(result).toBe(false);
    });

    it("returns false when not all next longitudes indicate direct motion", () => {
      const result = s.isDirect({
        currentLongitude: 100,
        nextLongitudes: [101, 99], // Mixed - not all direct
        previousLongitudes: [102, 101],
      });

      expect(result).toBe(false);
    });
  });
});
