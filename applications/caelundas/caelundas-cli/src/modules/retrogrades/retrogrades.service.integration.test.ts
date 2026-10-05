import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import {
  MARGIN_MINUTES,
  retrogradeBodies,
} from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { RetrogradesService } from "./retrogrades.service";

import type { RetrogradeBody } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

/**
 * Integration tests for planetary station detection (retrograde and direct).
 *
 * These tests verify the full detection pipeline using carefully constructed
 * 61-minute longitude windows (MARGIN_MINUTES before and after the current minute)
 * for all retrogradeBodies simultaneously.
 *
 * Unlike unit tests, which spy on private predicates (`isRetrograde`, `isDirect`)
 * via a NestJS TestingModule, these tests use a NestJS TestingModule without spies
 * and validate the event shape produced by the real detection logic.
 *
 * The station detection algorithm compares each minute's longitude to the 30
 * preceding and 30 following values via `normalizeForComparison`. A retrograde
 * station occurs when the planet reaches a longitude maximum (all previous values
 * lower, all next values no higher). A direct station is the inverse minimum.
 */

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

let service: RetrogradesService;

/**
 * Builds a Record<RetrogradeBody, CoordinateEphemeris> across the 61-minute detection
 * window (MARGIN_MINUTES before and after `minute`). Each body maps to its own
 * timestamp-keyed CoordinateEphemeris. Every body defaults to a constant longitude of
 * 100°. An optional override specifies a different `previous` / `current` / `next`
 * pattern for one body so that targeted station scenarios can be tested in isolation.
 */
function createRetrogradeEphemeris(
  minute: Moment,
  override?: {
    body: RetrogradeBody;
    current: number;
    next: number;
    previous: number;
  },
): Record<RetrogradeBody, CoordinateEphemeris> {
  const DEFAULT_LONGITUDE = 100;

  const ephemerisByBody = {} as Record<RetrogradeBody, CoordinateEphemeris>;

  for (const body of retrogradeBodies) {
    const isOverridden = override?.body === body;
    const bodyEphemeris: CoordinateEphemeris = {};

    for (let offset = 1; offset <= MARGIN_MINUTES; offset++) {
      const previousTimestamp = minute
        .clone()
        .subtract(offset, "minutes")
        .toISOString();
      const nextTimestamp = minute.clone().add(offset, "minutes").toISOString();
      const previousLongitude = isOverridden
        ? override.previous
        : DEFAULT_LONGITUDE;
      const nextLongitude = isOverridden ? override.next : DEFAULT_LONGITUDE;

      bodyEphemeris[previousTimestamp] = {
        latitude: 0,
        longitude: previousLongitude,
      };
      bodyEphemeris[nextTimestamp] = { latitude: 0, longitude: nextLongitude };
    }

    const currentTimestamp = minute.toISOString();
    const currentLongitude = isOverridden
      ? override.current
      : DEFAULT_LONGITUDE;
    bodyEphemeris[currentTimestamp] = {
      latitude: 0,
      longitude: currentLongitude,
    };

    ephemerisByBody[body] = bodyEphemeris;
  }

  return ephemerisByBody;
}

describe("retrogrades.events integration", () => {
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
  });

  const minute = moment.utc("2024-09-09T12:00:00.000Z");

  it("detects a Mercury retrograde station when longitude reaches a maximum", () => {
    expect.hasAssertions(); // isRetrograde: ALL normalizeForComparison(previous, current) < current

    //               AND ALL normalizeForComparison(next, current) <= current
    // Mercury longitude peaks at 100.0 — all previous and next values are 99.5
    const coordinateEphemerisByBody = createRetrogradeEphemeris(minute, {
      body: "mercury",
      current: 100,
      next: 99.5,
      previous: 99.5,
    });

    const events = service.detect({ coordinateEphemerisByBody, minute });

    expect(events).toHaveLength(1);
    expect(events[0]?.categories).toContain("Direction");
    expect(events[0]?.categories).toContain("Retrograde");
    expect(events[0]?.description).toContain("Mercury Stationary Retrograde");
    expect(events[0]?.start).toStrictEqual(minute);
  });

  it("detects a Mercury direct station when longitude reaches a minimum", () => {
    expect.hasAssertions(); // isDirect: ALL normalizeForComparison(previous, current) > current

    //           AND ALL normalizeForComparison(next, current) >= current
    // Mercury longitude bottoms at 100.0 — all previous and next values are 100.5
    const coordinateEphemerisByBody = createRetrogradeEphemeris(minute, {
      body: "mercury",
      current: 100,
      next: 100.5,
      previous: 100.5,
    });

    const events = service.detect({ coordinateEphemerisByBody, minute });

    expect(events).toHaveLength(1);
    expect(events[0]?.categories).toContain("Direction");
    expect(events[0]?.categories).toContain("Direct");
    expect(events[0]?.description).toContain("Mercury Stationary Direct");
    expect(events[0]?.start).toStrictEqual(minute);
  });

  it("returns no events when all planetary longitudes are constant", () => {
    expect.hasAssertions(); // Constant longitude of 100° fails both station conditions:

    //   isRetrograde requires previous < current; 100 < 100 is false
    //   isDirect requires previous > current; 100 > 100 is false
    const coordinateEphemerisByBody = createRetrogradeEphemeris(minute);

    const events = service.detect({ coordinateEphemerisByBody, minute });

    expect(events).toHaveLength(0);
  });
});
