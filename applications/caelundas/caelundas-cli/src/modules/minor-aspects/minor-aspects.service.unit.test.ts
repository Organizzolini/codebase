import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectEphemerisService } from "../aspects/aspect-ephemeris.service";
import { AspectEventFormattingService } from "../aspects/aspect-event-formatting.service";
import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import { aspectBodies as minorAspectBodies } from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { MinorAspectsEventService } from "./minor-aspects-event.service";
import { MinorAspectsProgressiveService } from "./minor-aspects-progressive.service";
import { MinorAspectsService } from "./minor-aspects.service";

import type { Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(MinorAspectsService, () => {
  let service: MinorAspectsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        MinorAspectsService,
        AspectEphemerisService,
        MinorAspectsEventService,
        MinorAspectsProgressiveService,
        AspectsUtilitiesService,
        AspectEventFormattingService,
        MathService,
        ProgressiveAspectService,
        ProgressiveUtilitiesService,
      ],
    }).compile();
    service = await module.resolve(MinorAspectsService);
  });

  describe("detect", () => {
    const createEphemeris = (
      longitudes: Record<string, number>,
    ): CoordinateEphemeris => {
      return Object.fromEntries(
        Object.entries(longitudes).map(([timestamp, longitude]) => [
          timestamp,
          { latitude: 0, longitude },
        ]),
      );
    };

    const createDefaultEphemeris = (
      currentMinute: Moment,
      previousMinute: Moment,
      nextMinute: Moment,
    ): Record<Body, CoordinateEphemeris> => {
      // Create ephemeris for all minor aspect bodies with far-apart longitudes
      const allBodies = minorAspectBodies;

      const ephemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      // Position all bodies at 200° - a safe angle that doesn't create minor aspects
      // with common test positions (0°, 30°, 75°)
      // 200° from 0° = 200° (no aspect), from 30° = 170° (no aspect), from 75° = 125° (no aspect)
      allBodies.forEach((body) => {
        ephemerisByBody[body] = createEphemeris({
          [currentMinute.toISOString()]: 200,
          [nextMinute.toISOString()]: 200,
          [previousMinute.toISOString()]: 200,
        });
      });
      return ephemerisByBody;
    };

    it.each([
      {
        aspectDescription: "perfective semisextile",
        expectedBody: "Mercury",
        expectedPhase: "Perfective",
        expectedVerb: "semisextile",
        getCoordinateEphemerisByBody: (
          currentMinute: Moment,
          previousMinute: Moment,
          nextMinute: Moment,
        ): Record<Body, CoordinateEphemeris> => {
          const coordinateEphemerisByBody = createDefaultEphemeris(
            currentMinute,
            previousMinute,
            nextMinute,
          );

          coordinateEphemerisByBody.sun = createEphemeris({
            [currentMinute.toISOString()]: 30,
            [nextMinute.toISOString()]: 31,
            [previousMinute.toISOString()]: 29,
          });
          coordinateEphemerisByBody.mercury = createEphemeris({
            [currentMinute.toISOString()]: 0,
            [nextMinute.toISOString()]: 359,
            [previousMinute.toISOString()]: 1,
          });

          return coordinateEphemerisByBody;
        },
      },
      {
        aspectDescription: "forming semisquare",
        expectedBody: "Venus",
        expectedPhase: "Forming",
        expectedVerb: "semisquare",
        getCoordinateEphemerisByBody: (
          currentMinute: Moment,
          previousMinute: Moment,
          nextMinute: Moment,
        ): Record<Body, CoordinateEphemeris> => {
          const coordinateEphemerisByBody = createDefaultEphemeris(
            currentMinute,
            previousMinute,
            nextMinute,
          );

          coordinateEphemerisByBody.sun = createEphemeris({
            [currentMinute.toISOString()]: 0,
            [nextMinute.toISOString()]: 0,
            [previousMinute.toISOString()]: 0,
          });
          coordinateEphemerisByBody.venus = createEphemeris({
            [currentMinute.toISOString()]: 46.5,
            [nextMinute.toISOString()]: 45.5,
            [previousMinute.toISOString()]: 48,
          });

          return coordinateEphemerisByBody;
        },
      },
      {
        aspectDescription: "dissolving quincunx",
        expectedBody: "Mars",
        expectedPhase: "Dissolving",
        expectedVerb: "quincunx",
        getCoordinateEphemerisByBody: (
          currentMinute: Moment,
          previousMinute: Moment,
          nextMinute: Moment,
        ): Record<Body, CoordinateEphemeris> => {
          const safeLongitudes = [
            200, 202, 204, 206, 208, 210, 212, 214, 216, 218, 220, 201, 203,
            205, 207, 209, 211, 213, 215,
          ];
          const coordinateEphemerisByBody = {} as Record<
            Body,
            CoordinateEphemeris
          >;

          minorAspectBodies.forEach((body, index) => {
            const longitude = safeLongitudes[index] ?? 0;
            coordinateEphemerisByBody[body] = createEphemeris({
              [currentMinute.toISOString()]: longitude,
              [nextMinute.toISOString()]: longitude,
              [previousMinute.toISOString()]: longitude,
            });
          });

          coordinateEphemerisByBody.sun = createEphemeris({
            [currentMinute.toISOString()]: 0,
            [nextMinute.toISOString()]: 0,
            [previousMinute.toISOString()]: 0,
          });
          coordinateEphemerisByBody.mars = createEphemeris({
            [currentMinute.toISOString()]: 152.5,
            [nextMinute.toISOString()]: 154,
            [previousMinute.toISOString()]: 151,
          });

          return coordinateEphemerisByBody;
        },
      },
    ])(
      "detects $aspectDescription",
      ({
        expectedBody,
        expectedPhase,
        expectedVerb,
        getCoordinateEphemerisByBody,
      }) => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");
        const coordinateEphemerisByBody = getCoordinateEphemerisByBody(
          currentMinute,
          previousMinute,
          nextMinute,
        );

        const events = service.detect({
          coordinateEphemerisByBody,
          minute: currentMinute,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const detectedEvent = events.find(
          (event) =>
            event.description.includes(expectedVerb) &&
            event.description.includes("Sun") &&
            event.description.includes(expectedBody),
        );

        expect(detectedEvent).toBeDefined();
        expect(detectedEvent?.categories).toContain(expectedPhase);
      },
    );

    it("detects multiple aspects between different body pairs", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");
      const nextMinute = currentMinute.clone().add(1, "minute");

      const coordinateEphemerisByBody = createDefaultEphemeris(
        currentMinute,
        previousMinute,
        nextMinute,
      );

      // Set Sun, Mercury, Venus with semisextile and semisquare aspects
      // Sun at 30°, Mercury at 0° = semisextile (30°)
      // Sun at 30°, Venus at 75° = semisquare (45°)
      coordinateEphemerisByBody.sun = createEphemeris({
        [currentMinute.toISOString()]: 30,
        [nextMinute.toISOString()]: 31,
        [previousMinute.toISOString()]: 29,
      });
      coordinateEphemerisByBody.mercury = createEphemeris({
        [currentMinute.toISOString()]: 0,
        [nextMinute.toISOString()]: 359,
        [previousMinute.toISOString()]: 1,
      });
      coordinateEphemerisByBody.venus = createEphemeris({
        [currentMinute.toISOString()]: 75,
        [nextMinute.toISOString()]: 76,
        [previousMinute.toISOString()]: 74,
      });

      const events = service.detect({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events.length).toBeGreaterThanOrEqual(2);

      const sunMercuryAspect = events.find(
        (e) =>
          e.description.includes("Sun") && e.description.includes("Mercury"),
      );
      const sunVenusAspect = events.find(
        (e) => e.description.includes("Sun") && e.description.includes("Venus"),
      );

      expect(sunMercuryAspect).toBeDefined();
      expect(sunVenusAspect).toBeDefined();
    });

    it("does not detect aspects outside orb", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");
      const nextMinute = currentMinute.clone().add(1, "minute");

      // Create ephemeris with all bodies clustered in a small range to avoid aspects
      // Minor aspects: 30° (2° orb), 45° (2° orb), 135° (2° orb), 150° (3° orb)
      // If all bodies are within a ~20° range, no pairs will have angles matching minor aspects
      // Positions: 50° through 70° (20° span, all angles < 28° which is outside all aspect orbs)
      const safeLongitudes = [
        50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 51, 53, 55, 57, 59, 61, 63,
        65,
      ];
      const allBodies = minorAspectBodies;

      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      allBodies.forEach((body, index) => {
        const longitude = safeLongitudes[index] ?? 0;
        coordinateEphemerisByBody[body] = createEphemeris({
          [currentMinute.toISOString()]: longitude,
          [nextMinute.toISOString()]: longitude,
          [previousMinute.toISOString()]: longitude,
        });
      });

      const events = service.detect({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(0);
    });

    it("does not create duplicate events for same body pair", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");
      const nextMinute = currentMinute.clone().add(1, "minute");

      const coordinateEphemerisByBody = createDefaultEphemeris(
        currentMinute,
        previousMinute,
        nextMinute,
      );

      coordinateEphemerisByBody.sun = createEphemeris({
        [currentMinute.toISOString()]: 30,
        [nextMinute.toISOString()]: 31,
        [previousMinute.toISOString()]: 29,
      });
      coordinateEphemerisByBody.mercury = createEphemeris({
        [currentMinute.toISOString()]: 0,
        [nextMinute.toISOString()]: 359,
        [previousMinute.toISOString()]: 1,
      });

      const events = service.detect({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      const sunMercuryEvents = events.filter(
        (e) =>
          e.description.includes("Sun") && e.description.includes("Mercury"),
      );

      expect(sunMercuryEvents).toHaveLength(1);
    });

    it("skips duplicate body entries when scanning body pairs", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");
      const nextMinute = currentMinute.clone().add(1, "minute");
      const coordinateEphemerisByBody = createDefaultEphemeris(
        currentMinute,
        previousMinute,
        nextMinute,
      );

      (minorAspectBodies as unknown as string[]).push("sun");
      try {
        expect(
          service.detect({
            coordinateEphemerisByBody,
            minute: currentMinute,
          }),
        ).toStrictEqual([]);
      } finally {
        (minorAspectBodies as unknown as string[]).pop();
      }
    });
  });

  describe("getMinorAspectEvent", () => {
    it("creates perfective semisextile event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMinorAspectEvent({
        body1: "sun",
        body2: "moon",
        longitudeBody1: 0,
        longitudeBody2: 30,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("🎯");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("🌙");
      expect(event.summary).toContain("⚺");
      expect(event.description).toBe("Sun perfective semisextile Moon");
      expect(event.categories).toContain("Astronomy");
      expect(event.categories).toContain("Astrology");
      expect(event.categories).toContain("Minor Aspect");
      expect(event.categories).toContain("Sun");
      expect(event.categories).toContain("Moon");
      expect(event.categories).toContain("Semisextile");
      expect(event.categories).toContain("Perfective");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
    });

    it("creates forming semisquare event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMinorAspectEvent({
        body1: "sun",
        body2: "venus",
        longitudeBody1: 0,
        longitudeBody2: 44,
        phase: "forming",
        timestamp,
      });

      expect(event.summary).toContain("➡️");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("♀️");
      expect(event.summary).toContain("∠");
      expect(event.description).toBe("Sun forming semisquare Venus");
      expect(event.categories).toContain("Forming");
      expect(event.categories).toContain("Semisquare");
    });

    it("creates dissolving sesquiquadrate event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMinorAspectEvent({
        body1: "sun",
        body2: "mars",
        longitudeBody1: 0,
        longitudeBody2: 136,
        phase: "dissolving",
        timestamp,
      });

      expect(event.summary).toContain("⬅️");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("♂️");
      expect(event.summary).toContain("⚼");
      expect(event.description).toBe("Sun dissolving sesquiquadrate Mars");
      expect(event.categories).toContain("Dissolving");
      expect(event.categories).toContain("Sesquiquadrate");
    });

    it("creates quincunx event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMinorAspectEvent({
        body1: "sun",
        body2: "jupiter",
        longitudeBody1: 0,
        longitudeBody2: 150,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("⚻");
      expect(event.description).toContain("quincunx");
      expect(event.categories).toContain("Quincunx");
    });

    it("throws error when no minor aspect is found", () => {
      expect(() =>
        service.buildMinorAspectEvent({
          body1: "sun",
          body2: "moon",
          longitudeBody1: 0,
          longitudeBody2: 90,
          phase: "perfective",
          timestamp: moment.utc("2024-03-21T12:00:00.000Z"),
        }),
      ).toThrow("No minor aspect found");
    });

    it("handles wrapped longitudes (near 360/0 degrees)", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMinorAspectEvent({
        body1: "sun",
        body2: "moon",
        longitudeBody1: 358,
        longitudeBody2: 28,
        phase: "perfective",
        timestamp,
      });

      expect(event.description).toContain("semisextile");
    });
  });

  describe("detectProgressive", () => {
    const createMinorAspectEvent = (
      body1: string,
      body2: string,
      aspect: string,
      phase: string,
      timestamp: Moment,
    ): Event => {
      return {
        categories: [
          "Astronomy",
          "Astrology",
          "Minor Aspect",
          body1,
          body2,
          aspect,
          phase,
        ],
        description: `${body1} ${phase.toLowerCase()} ${aspect.toLowerCase()} ${body2}`,
        end: timestamp,
        start: timestamp,
        summary: `${phase} ${body1} ${aspect} ${body2}`,
      };
    };

    it("creates progressive events from forming and dissolving pairs", () => {
      expect.hasAssertions(); // Note: Categories must use Start Case for body/aspect names to match _.startCase() conversion

      const forming = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisextile",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const dissolving = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisextile",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );

      const events = [forming, dissolving];
      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]).toBeDefined();
      expect(progressiveEvents[0]?.start).toStrictEqual(forming.start);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolving.start);
      expect(progressiveEvents[0]?.description).toContain("semisextile");
      expect(progressiveEvents[0]?.categories).toContain("Minor Aspect");
      expect(progressiveEvents[0]?.categories).toContain("Simple Aspect");
    });

    it("handles multiple aspect types for same body pair", () => {
      const semisextileForming = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisextile",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const semisextileDissolving = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisextile",
        "Dissolving",
        moment.utc("2024-03-21T12:00:00.000Z"),
      );
      const semisquareForming = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisquare",
        "Forming",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );
      const semisquareDissolving = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisquare",
        "Dissolving",
        moment.utc("2024-03-21T16:00:00.000Z"),
      );

      const events = [
        semisextileForming,
        semisextileDissolving,
        semisquareForming,
        semisquareDissolving,
      ];
      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(2);
    });

    it("handles multiple body pairs", () => {
      const sunMercuryForming = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisextile",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const sunMercuryDissolving = createMinorAspectEvent(
        "Sun",
        "Mercury",
        "Semisextile",
        "Dissolving",
        moment.utc("2024-03-21T12:00:00.000Z"),
      );
      const venusJupiterForming = createMinorAspectEvent(
        "Venus",
        "Jupiter",
        "Quincunx",
        "Forming",
        moment.utc("2024-03-21T12:00:00.000Z"),
      );
      const venusJupiterDissolving = createMinorAspectEvent(
        "Venus",
        "Jupiter",
        "Quincunx",
        "Dissolving",
        moment.utc("2024-03-21T16:00:00.000Z"),
      );

      const events = [
        sunMercuryForming,
        sunMercuryDissolving,
        venusJupiterForming,
        venusJupiterDissolving,
      ];
      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(2);
    });

    it("filters out non-minor-aspect events", () => {
      const minorAspectForming = createMinorAspectEvent(
        "Sun",
        "Venus",
        "Semisextile",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const minorAspectDissolving = createMinorAspectEvent(
        "Sun",
        "Venus",
        "Semisextile",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );
      const nonAspectEvent: Event = {
        categories: ["Solar", "Daily Cycle"],
        description: "Sunrise",
        end: moment.utc("2024-03-21T12:00:00.000Z"),
        start: moment.utc("2024-03-21T12:00:00.000Z"),
        summary: "Sunrise",
      };

      const events = [
        minorAspectForming,
        minorAspectDissolving,
        nonAspectEvent,
      ];
      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(1);
    });

    it("handles empty events array", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("sorts body names alphabetically in progressive event", () => {
      const forming = createMinorAspectEvent(
        "Venus",
        "Sun",
        "Semisextile",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const dissolving = createMinorAspectEvent(
        "Venus",
        "Sun",
        "Semisextile",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );

      const events = [forming, dissolving];
      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]).toBeDefined();
      // Should normalize to alphabetical order (capitalized)
      expect(progressiveEvents[0]?.description).toContain("Sun");
      expect(progressiveEvents[0]?.description).toContain("Venus");
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getMinorAspect", () => {
    it("returns semisextile for bodies 30° apart", () => {
      expect(
        service.getMinorAspect({ longitudeBody1: 0, longitudeBody2: 30 }),
      ).toBe("semisextile");
    });

    it("returns semisquare for bodies 45° apart", () => {
      expect(
        service.getMinorAspect({ longitudeBody1: 0, longitudeBody2: 45 }),
      ).toBe("semisquare");
    });

    it("returns sesquiquadrate for bodies 135° apart", () => {
      expect(
        service.getMinorAspect({ longitudeBody1: 0, longitudeBody2: 135 }),
      ).toBe("sesquiquadrate");
    });

    it("returns quincunx for bodies 150° apart", () => {
      expect(
        service.getMinorAspect({ longitudeBody1: 0, longitudeBody2: 150 }),
      ).toBe("quincunx");
    });

    it("returns null when no minor aspect is within orb", () => {
      expect(
        service.getMinorAspect({ longitudeBody1: 0, longitudeBody2: 10 }),
      ).toBeNull();
      expect(
        service.getMinorAspect({ longitudeBody1: 0, longitudeBody2: 120 }),
      ).toBeNull();
    });
  });

  describe("getMinorAspectPhase", () => {
    it("detects minor aspect phases", () => {
      const phase = service.getMinorAspectPhase({
        currentLongitudeBody1: 0,
        currentLongitudeBody2: 29,
        nextLongitudeBody1: 0,
        nextLongitudeBody2: 30,
        previousLongitudeBody1: 0,
        previousLongitudeBody2: 27,
      });

      expect(phase).toBe("forming");
    });
  });
});
