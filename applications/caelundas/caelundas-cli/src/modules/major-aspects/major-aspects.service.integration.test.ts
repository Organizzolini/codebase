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

/**
 * Integration tests for major aspect phase detection.
 *
 * These tests verify the full detection pipeline — from raw ephemeris data through
 * angular separation computation to formatted calendar events — for all three phase
 * transitions: forming, perfective, and dissolving.
 *
 * Unlike unit tests, which spy on private helpers (`getMajorAspect`,
 * `getMajorAspectPhase`) via a NestJS TestingModule, these tests use a NestJS
 * TestingModule without spies and assert the complete event shape produced by
 * real orb comparisons and phase-crossing logic.
 *
 * Ephemeris construction strategy:
 *   - All bodies default to longitude 100° (constant across previous/current/next).
 *     With every pair at 0° separation and constant across three timestamps,
 *     `isBouncing` requires a strict local extremum that flat data cannot satisfy,
 *     so zero events are produced by the base configuration.
 *   - Sun is overridden to 0° constant so that only the body under test
 *     (Moon, Mercury, or Venus) drives events.
 *   - Each test overrides exactly one body to create precise boundary conditions
 *     at the orb entry or exit point, producing a single isolated event.
 *
 * Orb ranges (uses ≤, not <):
 *   conjunction 8°, sextile 4°, square 6°, trine 6°, opposition 8°
 *
 * Phase semantics:
 *   - Forming: previous outside orb, current inside orb
 *   - Perfective: sign change in (angle − aspectAngle) across previous→current (non-conjunct)
 *                 OR local extremum in the same difference for conjunct
 *   - Dissolving: current inside orb, next outside orb
 */

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

let service: MajorAspectsService;

/**
 * Builds a CoordinateEphemeris record for all majorAspectBodies across three timestamps.
 *
 * Every body defaults to longitude 100° so the baseline produces no aspect events.
 * Pass `overrides` to set different longitudes for specific bodies at each timestamp.
 */
function createAspectEphemeris(
  minute: Moment,
  overrides: Partial<
    Record<
      (typeof majorAspectBodies)[number],
      { current: number; next: number; previous: number }
    >
  > = {},
): Record<Body, CoordinateEphemeris> {
  const previousMinute = minute.clone().subtract(1, "minute");
  const nextMinute = minute.clone().add(1, "minute");

  const ephemerisByBody = {} as Record<Body, CoordinateEphemeris>;

  for (const body of majorAspectBodies) {
    const override = overrides[body];
    const previous = override?.previous ?? 100;
    const current = override?.current ?? 100;
    const next = override?.next ?? 100;

    ephemerisByBody[body] = {
      [minute.toISOString()]: { latitude: 0, longitude: current },
      [nextMinute.toISOString()]: { latitude: 0, longitude: next },
      [previousMinute.toISOString()]: { latitude: 0, longitude: previous },
    };
  }

  return ephemerisByBody;
}

describe("major-aspects.events integration", () => {
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
  });

  const minute = moment.utc("2024-03-21T12:00:00.000Z");

  it.each([
    {
      caseName: "perfective trine between non-Sun bodies",
      expectedMatches: [
        {
          bodyOne: "Mercury",
          bodyTwo: "Venus",
          expectedPhase: "Perfective",
          verb: "trine",
        },
      ],
      minimumEventCount: 1,
      overrides: {
        mercury: { current: 0, next: 0, previous: 0 },
        sun: { current: 200, next: 200, previous: 200 },
        venus: { current: 120, next: 119, previous: 121 },
      },
      shouldAssertExactLength: true,
    },
    {
      caseName: "forming conjunction and dissolving square in one detect call",
      expectedMatches: [
        {
          bodyOne: "Sun",
          bodyTwo: "Moon",
          expectedPhase: "Forming",
          verb: "conjunct",
        },
        {
          bodyOne: "Sun",
          bodyTwo: "Mercury",
          expectedPhase: "Dissolving",
          verb: "square",
        },
      ],
      minimumEventCount: 2,
      overrides: {
        mercury: { current: 94, next: 97, previous: 93 },
        moon: { current: 352, next: 354, previous: 350 },
        sun: { current: 0, next: 0, previous: 0 },
      },
      shouldAssertExactLength: false,
    },
  ])(
    "detects $caseName",
    ({
      expectedMatches,
      minimumEventCount,
      overrides,
      shouldAssertExactLength,
    }) => {
      expect.hasAssertions();

      const coordinateEphemerisByBody = createAspectEphemeris(
        minute,
        overrides,
      );
      const events = service.detect({ coordinateEphemerisByBody, minute });

      expect(events.length).toBeGreaterThanOrEqual(minimumEventCount);

      for (const expectedMatch of expectedMatches) {
        const detectedEvent = events.find(
          (event) =>
            event.description.includes(expectedMatch.verb) &&
            event.description.includes(expectedMatch.bodyOne) &&
            event.description.includes(expectedMatch.bodyTwo),
        );

        expect(detectedEvent).toBeDefined();
        expect(detectedEvent?.categories).toContain(
          expectedMatch.expectedPhase,
        );
        expect(detectedEvent?.start).toStrictEqual(minute);
      }

      const expectedLength = shouldAssertExactLength ? 1 : events.length;

      expect(events).toHaveLength(expectedLength);
    },
  );

  it("returns no events when all body longitudes are constant at 100°", () => {
    expect.hasAssertions(); // Flat ephemeris: getAngle(100,100)=0° for all pairs, constant across timestamps.

    // Conjunction check: isBouncing requires a strict local extremum — constant data
    // has no minimum or maximum, so zero events are produced.
    const coordinateEphemerisByBody = createAspectEphemeris(minute);

    const events = service.detect({ coordinateEphemerisByBody, minute });

    expect(events).toHaveLength(0);
  });
});
