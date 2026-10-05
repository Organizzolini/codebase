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
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

/**
 * Integration tests for minor aspect phase detection.
 *
 * These tests verify the full detection pipeline for minor aspects — semisextile (30°),
 * semisquare (45°), sesquiquadrate (135°), and quincunx (150°) — from raw ephemeris
 * data through angular separation computation to formatted calendar events.
 *
 * Unlike unit tests, which spy on private helpers via a NestJS TestingModule, these
 * tests use a NestJS TestingModule without spies and assert the complete event shape
 * produced by real orb comparisons and phase-crossing logic.
 *
 * Ephemeris construction strategy:
 *   - All bodies default to longitude 100° (constant across previous/current/next).
 *     With every pair at 0° separation and no movement, `isBouncing` cannot fire
 *     (requires a strict local extremum) and `isCrossing` cannot fire (no sign change),
 *     so zero events are produced by the base configuration.
 *   - Sun is overridden to 0° constant so that only the body under test
 *     (Moon, Mercury, or Venus) drives events.
 *   - Each test overrides exactly one body to create precise boundary conditions
 *     at the orb entry or exit point, producing a single isolated event.
 *
 * Orb ranges (uses ≤, not <):
 *   semisextile 2°, semisquare 2°, sesquiquadrate 2°, quincunx 3°
 *
 * Phase semantics:
 *   - Forming: previous outside orb, current inside orb
 *   - Perfective: sign change in (angle − aspectAngle) across previous→current
 *   - Dissolving: current inside orb, next outside orb
 */

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

let service: MinorAspectsService;

/**
 * Builds a CoordinateEphemeris record for all minorAspectBodies across three timestamps.
 *
 * Every body defaults to longitude 100° so the baseline produces no aspect events.
 * Pass `overrides` to set different longitudes for specific bodies at each timestamp.
 */
function createAspectEphemeris(
  minute: Moment,
  overrides: Partial<
    Record<
      (typeof minorAspectBodies)[number],
      { current: number; next: number; previous: number }
    >
  > = {},
): Record<Body, CoordinateEphemeris> {
  const previousMinute = minute.clone().subtract(1, "minute");
  const nextMinute = minute.clone().add(1, "minute");

  const ephemerisByBody = {} as Record<Body, CoordinateEphemeris>;

  for (const body of minorAspectBodies) {
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

describe("minor-aspects.events integration", () => {
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        MinorAspectsService,
        MinorAspectsEventService,
        MinorAspectsProgressiveService,
        AspectEphemerisService,
        AspectsUtilitiesService,
        AspectEventFormattingService,
        MathService,
        ProgressiveAspectService,
        ProgressiveUtilitiesService,
      ],
    }).compile();
    service = await module.resolve(MinorAspectsService);
  });

  const minute = moment.utc("2024-03-21T12:00:00.000Z");

  it.each([
    {
      caseName:
        "forming quincunx when Moon crosses into the 3 degree orb of 150",
      expectedBody: "Moon",
      expectedPhase: "Forming",
      expectedVerb: "quincunx",
      overrides: {
        moon: { current: 152.5, next: 151, previous: 154 },
        sun: { current: 0, next: 0, previous: 0 },
      },
    },
    {
      caseName:
        "perfective sesquiquadrate when Mercury crosses the exact 135 degree aspect",
      expectedBody: "Mercury",
      expectedPhase: "Perfective",
      expectedVerb: "sesquiquadrate",
      overrides: {
        mercury: { current: 135, next: 134, previous: 136 },
        sun: { current: 0, next: 0, previous: 0 },
      },
    },
    {
      caseName:
        "dissolving semisextile when Venus exits the 2 degree orb of 30",
      expectedBody: "Venus",
      expectedPhase: "Dissolving",
      expectedVerb: "semisextile",
      overrides: {
        sun: { current: 0, next: 0, previous: 0 },
        venus: { current: 31.8, next: 32.2, previous: 31 },
      },
    },
  ])(
    "detects $caseName",
    ({ expectedBody, expectedPhase, expectedVerb, overrides }) => {
      expect.hasAssertions();

      const coordinateEphemerisByBody = createAspectEphemeris(
        minute,
        overrides,
      );
      const events = service.detect({ coordinateEphemerisByBody, minute });

      const detectedEvent = events.find(
        (event) =>
          event.description.includes(expectedVerb) &&
          event.description.includes("Sun") &&
          event.description.includes(expectedBody),
      );

      expect(detectedEvent).toBeDefined();
      expect(detectedEvent?.categories).toContain(expectedPhase);
      expect(detectedEvent?.start).toStrictEqual(minute);
    },
  );

  it("returns no events when all body longitudes are constant at 100°", () => {
    expect.hasAssertions(); // Flat ephemeris: getAngle(100,100)=0° for all pairs, constant across timestamps.

    // No aspect angle is at 0°, so all pairs are far outside every minor aspect orb.
    const coordinateEphemerisByBody = createAspectEphemeris(minute);

    const events = service.detect({ coordinateEphemerisByBody, minute });

    expect(events).toHaveLength(0);
  });
});
