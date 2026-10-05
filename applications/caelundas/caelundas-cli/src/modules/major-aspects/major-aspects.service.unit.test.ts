import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectEphemerisService } from "../aspects/aspect-ephemeris.service";
import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import { aspectBodies as majorAspectBodies } from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { MajorAspectEventService } from "./major-aspect-event.service";
import { MajorAspectProgressiveService } from "./major-aspect-progressive.service";
import { MajorAspectsService } from "./major-aspects.service";

import type { Body } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(MajorAspectsService, () => {
  let service: MajorAspectsService;
  let aspectsUtilitiesService: AspectsUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        MajorAspectsService,
        MajorAspectEventService,
        MajorAspectProgressiveService,
        AspectEphemerisService,
        AspectsUtilitiesService,
        MathService,
        ProgressiveAspectService,
        ProgressiveUtilitiesService,
      ],
    }).compile();
    service = await module.resolve(MajorAspectsService);
    aspectsUtilitiesService = await module.resolve(AspectsUtilitiesService);
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
      // Create ephemeris for all major aspect bodies with far-apart longitudes
      const allBodies = majorAspectBodies;

      const ephemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      allBodies.forEach((body, index) => {
        const longitude = index * 20; // Space them out
        ephemerisByBody[body] = createEphemeris({
          [currentMinute.toISOString()]: longitude,
          [nextMinute.toISOString()]: longitude,
          [previousMinute.toISOString()]: longitude,
        });
      });
      return ephemerisByBody;
    };

    it.each([
      {
        aspectDescription: "perfective conjunction",
        expectedBody: "Mercury",
        expectedPhase: "Perfective",
        expectedVerb: "conjunct",
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
          coordinateEphemerisByBody.mercury = createEphemeris({
            [currentMinute.toISOString()]: 0,
            [nextMinute.toISOString()]: 359,
            [previousMinute.toISOString()]: 1,
          });
        },
      },
      {
        aspectDescription: "forming opposition",
        expectedBody: "Venus",
        expectedPhase: "Forming",
        expectedVerb: "opposite",
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
          coordinateEphemerisByBody.venus = createEphemeris({
            [currentMinute.toISOString()]: 187,
            [nextMinute.toISOString()]: 185,
            [previousMinute.toISOString()]: 189,
          });
        },
      },
      {
        aspectDescription: "dissolving trine",
        expectedBody: "Mars",
        expectedPhase: "Dissolving",
        expectedVerb: "trine",
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
            [currentMinute.toISOString()]: 125,
            [nextMinute.toISOString()]: 127,
            [previousMinute.toISOString()]: 122,
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

      coordinateEphemerisByBody.sun = createEphemeris({
        [currentMinute.toISOString()]: 0,
        [nextMinute.toISOString()]: 0,
        [previousMinute.toISOString()]: 0,
      });
      coordinateEphemerisByBody.mercury = createEphemeris({
        [currentMinute.toISOString()]: 90,
        [nextMinute.toISOString()]: 89,
        [previousMinute.toISOString()]: 91,
      });
      coordinateEphemerisByBody.venus = createEphemeris({
        [currentMinute.toISOString()]: 180,
        [nextMinute.toISOString()]: 181,
        [previousMinute.toISOString()]: 179,
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
      // Major aspects need specific angle differences: 0°, 60°, 90°, 120°, 180°
      // If all bodies are within a ~35° range, no pairs will have angles matching major aspects
      // Positions: 10° through 45° (35° span, all angles < 56° which is outside all aspect orbs)
      const safeLongitudes = [
        10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44,
        46,
      ];
      const allBodies = majorAspectBodies;

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
        [currentMinute.toISOString()]: 0,
        [nextMinute.toISOString()]: 0,
        [previousMinute.toISOString()]: 0,
      });
      coordinateEphemerisByBody.jupiter = createEphemeris({
        [currentMinute.toISOString()]: 0,
        [nextMinute.toISOString()]: 359,
        [previousMinute.toISOString()]: 1,
      });

      const events = service.detect({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      // Should only have one sun-jupiter conjunction, not two (sun-jupiter and jupiter-sun)
      const sunJupiterEvents = events.filter(
        (e) =>
          e.description.includes("Sun") && e.description.includes("Jupiter"),
      );

      expect(sunJupiterEvents).toHaveLength(1);
    });
  });

  // Event-construction and progressive-pairing coverage moved to:
  // - major-aspect-event.service.unit.test.ts
  // - major-aspect-progressive.service.unit.test.ts

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("isAspect", () => {
    it("returns true for conjunction within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "conjunct",
          longitudeBody1: 0,
          longitudeBody2: 5,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "conjunct",
          longitudeBody1: 100,
          longitudeBody2: 105,
        }),
      ).toBe(true);
    });

    it("returns false for conjunction outside orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "conjunct",
          longitudeBody1: 0,
          longitudeBody2: 10,
        }),
      ).toBe(false);
    });

    it("returns true for opposition within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "opposite",
          longitudeBody1: 0,
          longitudeBody2: 180,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "opposite",
          longitudeBody1: 0,
          longitudeBody2: 175,
        }),
      ).toBe(true);
    });

    it("returns true for trine within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "trine",
          longitudeBody1: 0,
          longitudeBody2: 120,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "trine",
          longitudeBody1: 0,
          longitudeBody2: 115,
        }),
      ).toBe(true);
    });

    it("returns true for square within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "square",
          longitudeBody1: 0,
          longitudeBody2: 90,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "square",
          longitudeBody1: 0,
          longitudeBody2: 85,
        }),
      ).toBe(true);
    });

    it("returns true for sextile within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "sextile",
          longitudeBody1: 0,
          longitudeBody2: 60,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "sextile",
          longitudeBody1: 0,
          longitudeBody2: 57,
        }),
      ).toBe(true);
    });
  });

  describe("getMajorAspectPhase", () => {
    it("returns forming when entering aspect orb", () => {
      const phase = service.getMajorAspectPhase({
        currentLongitudeBody1: 0,
        currentLongitudeBody2: 173,
        nextLongitudeBody1: 0,
        nextLongitudeBody2: 175,
        previousLongitudeBody1: 0,
        previousLongitudeBody2: 171,
      });

      expect(phase).toBe("forming");
    });

    it("returns dissolving when exiting aspect orb", () => {
      const phase = service.getMajorAspectPhase({
        currentLongitudeBody1: 0,
        currentLongitudeBody2: 187,
        nextLongitudeBody1: 0,
        nextLongitudeBody2: 189,
        previousLongitudeBody1: 0,
        previousLongitudeBody2: 185,
      });

      expect(phase).toBe("dissolving");
    });

    it("returns perfective when crossing the exact aspect angle", () => {
      const phase = service.getMajorAspectPhase({
        currentLongitudeBody1: 0,
        currentLongitudeBody2: 180,
        nextLongitudeBody1: 0,
        nextLongitudeBody2: 181,
        previousLongitudeBody1: 0,
        previousLongitudeBody2: 179,
      });

      expect(phase).toBe("perfective");
    });

    it("returns null when not in any aspect phase", () => {
      const phase = service.getMajorAspectPhase({
        currentLongitudeBody1: 0,
        currentLongitudeBody2: 46,
        nextLongitudeBody1: 0,
        nextLongitudeBody2: 47,
        previousLongitudeBody1: 0,
        previousLongitudeBody2: 45,
      });

      expect(phase).toBeNull();
    });
  });
});
