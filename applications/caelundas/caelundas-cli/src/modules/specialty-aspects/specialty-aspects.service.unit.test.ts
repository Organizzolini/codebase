import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectEventFormattingService } from "../aspects/aspect-event-formatting.service";
import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import { aspectBodies as specialtyAspectBodies } from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { SpecialtyAspectsEventService } from "./specialty-aspects-event.service";
import { SpecialtyAspectsProgressiveService } from "./specialty-aspects-progressive.service";
import { SpecialtyAspectsService } from "./specialty-aspects.service";

import type { Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(SpecialtyAspectsService, () => {
  let service: SpecialtyAspectsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        SpecialtyAspectsService,
        SpecialtyAspectsEventService,
        SpecialtyAspectsProgressiveService,
        AspectsUtilitiesService,
        AspectEventFormattingService,
        MathService,
        ProgressiveAspectService,
        ProgressiveUtilitiesService,
      ],
    }).compile();
    service = await module.resolve(SpecialtyAspectsService);
  });

  describe("detect", () => {
    const createEphemeris = (
      longitudes: Record<string, number>,
    ): CoordinateEphemeris => {
      const ephemeris: CoordinateEphemeris = {};
      Object.keys(longitudes).forEach((timestamp) => {
        const longitude = longitudes[timestamp];
        if (longitude === undefined) {
          throw new Error(`longitude is undefined for timestamp ${timestamp}`);
        }
        ephemeris[timestamp] = {
          latitude: 0,
          longitude,
        };
      });
      return ephemeris;
    };

    const createDefaultEphemeris = (
      currentMinute: Moment,
      previousMinute: Moment,
      nextMinute: Moment,
    ): Record<Body, CoordinateEphemeris> => {
      const allBodies = specialtyAspectBodies;

      const ephemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      // Position all bodies at 200° - a safe angle that doesn't create specialty aspects
      // with common test positions (0°, 40°, 72°, 108°)
      // Specialty aspects: quintile (72°), biquintile (144°), septile (51.43°),
      // novile (40°), undecile (32.73°), decile (36°), tredecile (108°)
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
        aspectDescription: "perfective quintile",
        expectedBody: "Mercury",
        expectedPhase: "Perfective",
        expectedVerb: "quintile",
        setScenarioEphemeris: (
          currentMinute: Moment,
          previousMinute: Moment,
          nextMinute: Moment,
          coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>,
        ): void => {
          coordinateEphemerisByBody.sun = createEphemeris({
            [currentMinute.toISOString()]: 72,
            [nextMinute.toISOString()]: 73,
            [previousMinute.toISOString()]: 71,
          });
          coordinateEphemerisByBody.mercury = createEphemeris({
            [currentMinute.toISOString()]: 0,
            [nextMinute.toISOString()]: 359,
            [previousMinute.toISOString()]: 1,
          });
        },
      },
      {
        aspectDescription: "forming quintile",
        expectedBody: "Venus",
        expectedPhase: "Forming",
        expectedVerb: "quintile",
        setScenarioEphemeris: (
          currentMinute: Moment,
          previousMinute: Moment,
          nextMinute: Moment,
          coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>,
        ): void => {
          coordinateEphemerisByBody.sun = createEphemeris({
            [currentMinute.toISOString()]: 72,
            [nextMinute.toISOString()]: 72,
            [previousMinute.toISOString()]: 72,
          });
          coordinateEphemerisByBody.venus = createEphemeris({
            [currentMinute.toISOString()]: 358.5,
            [nextMinute.toISOString()]: 359.5,
            [previousMinute.toISOString()]: 357,
          });
        },
      },
      {
        aspectDescription: "dissolving novile",
        expectedBody: "Mars",
        expectedPhase: "Dissolving",
        expectedVerb: "novile",
        setScenarioEphemeris: (
          currentMinute: Moment,
          previousMinute: Moment,
          nextMinute: Moment,
          coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>,
        ): void => {
          coordinateEphemerisByBody.sun = createEphemeris({
            [currentMinute.toISOString()]: 0,
            [nextMinute.toISOString()]: 0,
            [previousMinute.toISOString()]: 0,
          });
          coordinateEphemerisByBody.mars = createEphemeris({
            [currentMinute.toISOString()]: 40.8,
            [nextMinute.toISOString()]: 41.5,
            [previousMinute.toISOString()]: 40.5,
          });
        },
      },
    ])(
      "detects $aspectDescription",
      ({ expectedBody, expectedPhase, expectedVerb, setScenarioEphemeris }) => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        const previousMinute = currentMinute.clone().subtract(1, "minute");
        const nextMinute = currentMinute.clone().add(1, "minute");
        const coordinateEphemerisByBody = createDefaultEphemeris(
          currentMinute,
          previousMinute,
          nextMinute,
        );

        setScenarioEphemeris(
          currentMinute,
          previousMinute,
          nextMinute,
          coordinateEphemerisByBody,
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

      // Set Sun, Mercury, Venus with quintile and novile aspects
      // Sun at 72°, Mercury at 0° = quintile (72°)
      // Sun at 72°, Venus at 112° = novile (40°)
      coordinateEphemerisByBody.sun = createEphemeris({
        [currentMinute.toISOString()]: 72,
        [nextMinute.toISOString()]: 73,
        [previousMinute.toISOString()]: 71,
      });
      coordinateEphemerisByBody.mercury = createEphemeris({
        [currentMinute.toISOString()]: 0,
        [nextMinute.toISOString()]: 359,
        [previousMinute.toISOString()]: 1,
      });
      coordinateEphemerisByBody.venus = createEphemeris({
        [currentMinute.toISOString()]: 112,
        [nextMinute.toISOString()]: 113,
        [previousMinute.toISOString()]: 111,
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
      // Specialty aspects have tight orbs (1-2°), so spacing within 10° avoids all aspects
      // Positions: 50° through 60° (10° span, no pairs will match specialty aspect angles)
      const safeLongitudes = [
        50, 52, 54, 56, 58, 60, 51, 53, 55, 57, 59, 50.5, 52.5, 54.5, 56.5,
        58.5, 60.5, 51.5, 53.5,
      ];
      const allBodies = specialtyAspectBodies;

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
        [currentMinute.toISOString()]: 72,
        [nextMinute.toISOString()]: 73,
        [previousMinute.toISOString()]: 71,
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

    it("skips duplicate body entries while iterating specialty body pairs", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");
      const nextMinute = currentMinute.clone().add(1, "minute");
      const coordinateEphemerisByBody = createDefaultEphemeris(
        currentMinute,
        previousMinute,
        nextMinute,
      );

      (specialtyAspectBodies as unknown as string[]).push("sun");
      try {
        expect(
          service.detect({
            coordinateEphemerisByBody,
            minute: currentMinute,
          }),
        ).toStrictEqual([]);
      } finally {
        (specialtyAspectBodies as unknown as string[]).pop();
      }
    });
  });

  describe("getSpecialtyAspectPhase", () => {
    it("delegates specialty phase detection", () => {
      expect(
        service.getSpecialtyAspectPhase({
          currentLongitudeBody1: 0,
          currentLongitudeBody2: 72,
          nextLongitudeBody1: 1,
          nextLongitudeBody2: 73,
          previousLongitudeBody1: 359,
          previousLongitudeBody2: 71,
        }),
      ).toBe("perfective");
    });
  });

  describe("getSpecialtyAspectEvent", () => {
    it("creates perfective quintile event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildSpecialtyAspectEvent({
        body1: "sun",
        body2: "moon",
        longitudeBody1: 0,
        longitudeBody2: 72,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("🎯");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("🌙");
      expect(event.summary).toContain("⬠");
      expect(event.description).toBe("Sun perfective quintile Moon");
      expect(event.categories).toContain("Astronomy");
      expect(event.categories).toContain("Astrology");
      expect(event.categories).toContain("Specialty Aspect");
      expect(event.categories).toContain("Sun");
      expect(event.categories).toContain("Moon");
      expect(event.categories).toContain("Quintile");
      expect(event.categories).toContain("Perfective");
    });

    it("creates forming septile event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildSpecialtyAspectEvent({
        body1: "sun",
        body2: "venus",
        longitudeBody1: 0,
        longitudeBody2: 50.8,
        phase: "forming",
        timestamp,
      });

      expect(event.summary).toContain("➡️");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("♀️");
      expect(event.summary).toContain("S");
      expect(event.description).toBe("Sun forming septile Venus");
      expect(event.categories).toContain("Forming");
    });

    it("creates dissolving biquintile event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildSpecialtyAspectEvent({
        body1: "sun",
        body2: "mars",
        longitudeBody1: 0,
        longitudeBody2: 145.5,
        phase: "dissolving",
        timestamp,
      });

      expect(event.summary).toContain("⬅️");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("♂️");
      expect(event.summary).toContain("±");
      expect(event.description).toBe("Sun dissolving biquintile Mars");
      expect(event.categories).toContain("Dissolving");
    });

    it("creates novile event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildSpecialtyAspectEvent({
        body1: "sun",
        body2: "jupiter",
        longitudeBody1: 0,
        longitudeBody2: 40,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("🎯");
      expect(event.summary).toContain("N");
      expect(event.description).toContain("novile");
    });

    it("throws error when no specialty aspect is found", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");

      expect(() =>
        service.buildSpecialtyAspectEvent({
          body1: "sun",
          body2: "moon",
          longitudeBody1: 0,
          longitudeBody2: 90,
          phase: "perfective",
          timestamp,
        }),
      ).toThrow("No specialty aspect found");
    });

    it("handles wrapped longitudes (near 360/0 degrees)", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildSpecialtyAspectEvent({
        body1: "sun",
        body2: "moon",
        longitudeBody1: 350,
        longitudeBody2: 62,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("quintile");
      expect(event.description).toBe("Sun perfective quintile Moon");
    });
  });

  describe("detectProgressive", () => {
    it("creates progressive events from forming and dissolving pairs", () => {
      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Quintile",
          "Forming",
        ],
        description: "Sun forming quintile Mercury",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "➡️ ☀️ ⬠ ☿ Sun forming quintile Mercury",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Quintile",
          "Dissolving",
        ],
        description: "Sun dissolving quintile Mercury",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "⬅️ ☀️ ⬠ ☿ Sun dissolving quintile Mercury",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]).toBeDefined();
      expect(progressiveEvents[0]?.start).toStrictEqual(formingEvent.start);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolvingEvent.start);
      expect(progressiveEvents[0]?.description).toBe("Mercury quintile Sun");
      expect(progressiveEvents[0]?.categories).toContain("Simple Aspect");
      expect(progressiveEvents[0]?.categories).toContain("Specialty Aspect");
    });

    it("handles multiple aspect types for same body pair", () => {
      const quintileForming: Event = {
        categories: [
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Quintile",
          "Forming",
        ],
        description: "Sun forming quintile Mercury",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "forming",
      };

      const quintileDissolving: Event = {
        categories: [
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Quintile",
          "Dissolving",
        ],
        description: "Sun dissolving quintile Mercury",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "dissolving",
      };

      const biquintileForming: Event = {
        categories: [
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Biquintile",
          "Forming",
        ],
        description: "Sun forming biquintile Mercury",
        end: moment.utc("2024-03-22T10:00:00.000Z"),
        start: moment.utc("2024-03-22T10:00:00.000Z"),
        summary: "forming",
      };

      const biquintileDissolving: Event = {
        categories: [
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Biquintile",
          "Dissolving",
        ],
        description: "Sun dissolving biquintile Mercury",
        end: moment.utc("2024-03-22T14:00:00.000Z"),
        start: moment.utc("2024-03-22T14:00:00.000Z"),
        summary: "dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        quintileForming,
        quintileDissolving,
        biquintileForming,
        biquintileDissolving,
      ]);

      expect(progressiveEvents).toHaveLength(2);
      expect(
        progressiveEvents.find((e) => e.description.includes("quintile")),
      ).toBeDefined();
      expect(
        progressiveEvents.find((e) => e.description.includes("biquintile")),
      ).toBeDefined();
    });

    it("handles multiple body pairs", () => {
      const sunMercuryForming: Event = {
        categories: [
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Quintile",
          "Forming",
        ],
        description: "Sun forming quintile Mercury",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "forming",
      };

      const sunMercuryDissolving: Event = {
        categories: [
          "Specialty Aspect",
          "Sun",
          "Mercury",
          "Quintile",
          "Dissolving",
        ],
        description: "Sun dissolving quintile Mercury",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "dissolving",
      };

      const venusMarForming: Event = {
        categories: ["Specialty Aspect", "Venus", "Mars", "Septile", "Forming"],
        description: "Venus forming septile Mars",
        end: moment.utc("2024-03-21T11:00:00.000Z"),
        start: moment.utc("2024-03-21T11:00:00.000Z"),
        summary: "forming",
      };

      const venusMarDissolving: Event = {
        categories: [
          "Specialty Aspect",
          "Venus",
          "Mars",
          "Septile",
          "Dissolving",
        ],
        description: "Venus dissolving septile Mars",
        end: moment.utc("2024-03-21T15:00:00.000Z"),
        start: moment.utc("2024-03-21T15:00:00.000Z"),
        summary: "dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        sunMercuryForming,
        sunMercuryDissolving,
        venusMarForming,
        venusMarDissolving,
      ]);

      expect(progressiveEvents).toHaveLength(2);
      expect(
        progressiveEvents.find(
          (e) =>
            e.description.includes("Sun") && e.description.includes("Mercury"),
        ),
      ).toBeDefined();
      expect(
        progressiveEvents.find(
          (e) =>
            e.description.includes("Venus") && e.description.includes("Mars"),
        ),
      ).toBeDefined();
    });

    it("filters out non-specialty-aspect events", () => {
      const specialtyAspectEvent: Event = {
        categories: ["Specialty Aspect", "Sun", "Moon", "Quintile", "Forming"],
        description: "Sun forming quintile Moon",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "forming",
      };

      const nonSpecialtyAspectEvent: Event = {
        categories: ["Other"],
        description: "Some other event",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "other event",
      };

      const progressiveEvents = service.detectProgressive([
        specialtyAspectEvent,
        nonSpecialtyAspectEvent,
      ]);

      expect(
        progressiveEvents.every((e) =>
          e.categories.includes("Specialty Aspect"),
        ),
      ).toBe(true);
    });

    it("handles empty events array", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("sorts body names alphabetically in progressive event", () => {
      const formingEvent: Event = {
        categories: [
          "Specialty Aspect",
          "Venus",
          "Mars",
          "Quintile",
          "Forming",
        ],
        description: "Venus forming quintile Mars",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "forming",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Specialty Aspect",
          "Venus",
          "Mars",
          "Quintile",
          "Dissolving",
        ],
        description: "Venus dissolving quintile Mars",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]).toBeDefined();
      // Mars comes before Venus alphabetically
      expect(progressiveEvents[0]?.categories).toContain("Mars");
      expect(progressiveEvents[0]?.categories).toContain("Venus");

      const categories = progressiveEvents[0]?.categories;
      if (!categories) {
        throw new Error("categories is undefined");
      }
      const marsIndex = categories.indexOf("Mars");
      const venusIndex = categories.indexOf("Venus");

      expect(marsIndex).toBeLessThan(venusIndex);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSpecialtyAspect", () => {
    it("returns quintile for bodies 72° apart", () => {
      expect(
        service.getSpecialtyAspect({ longitudeBody1: 0, longitudeBody2: 72 }),
      ).toBe("quintile");
    });

    it("returns biquintile for bodies 144° apart", () => {
      expect(
        service.getSpecialtyAspect({ longitudeBody1: 0, longitudeBody2: 144 }),
      ).toBe("biquintile");
    });

    it("returns null when no specialty aspect is within orb", () => {
      expect(
        service.getSpecialtyAspect({ longitudeBody1: 0, longitudeBody2: 10 }),
      ).toBeNull();
    });
  });
});
