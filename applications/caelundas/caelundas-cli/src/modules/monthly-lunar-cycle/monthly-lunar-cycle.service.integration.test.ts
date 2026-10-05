import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { CalendarService } from "../calendar/calendar.service";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";

import { MonthlyLunarCycleService } from "./monthly-lunar-cycle.service";

import type { IlluminationEphemeris } from "../ephemeris/ephemeris.types";

/**
 * Integration tests for lunar phase detection.
 *
 * These tests exercise the complete detection pipeline with realistic illumination
 * boundary data for each of the four cardinal lunar phases: new moon (local minimum
 * below 50), full moon (local maximum above 50), first quarter (crossing 50 waxing),
 * and last quarter (crossing 50 waning).
 *
 * Unlike unit tests, which isolate individual predicates via spies, these tests
 * use a NestJS TestingModule without spies and assert the full event shape —
 * categories, summary, and timestamp — produced by real service calls.
 *
 * The illumination ephemeris spans MARGIN_MINUTES before and after the current
 * minute (61 timestamps total), mirroring the window the service uses internally.
 */

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

let service: MonthlyLunarCycleService;

/**
 * Builds an IlluminationEphemeris covering `minute ± MARGIN_MINUTES` (61 timestamps).
 * Each window region receives its own uniform illumination value so that boundary
 * conditions can be expressed cleanly as `{ previous, current, next }`.
 */
function createIlluminationEphemeris(
  minute: Moment,
  values: { current: number; next: number; previous: number },
): IlluminationEphemeris {
  const { current, next, previous } = values;
  const ephemeris: IlluminationEphemeris = {};

  for (let offset = 1; offset <= MARGIN_MINUTES; offset++) {
    ephemeris[minute.clone().subtract(offset, "minutes").toISOString()] = {
      illumination: previous,
    };
    ephemeris[minute.clone().add(offset, "minutes").toISOString()] = {
      illumination: next,
    };
  }

  ephemeris[minute.toISOString()] = { illumination: current };

  return ephemeris;
}

describe("monthly-lunar-cycle.events integration", () => {
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        MonthlyLunarCycleService,
        CalendarService,
        {
          provide: ConfigService,
          useValue: { get: vi.fn<(propertyPath: string) => unknown>() },
        },
        LoggerService,
        MathService,
      ],
    }).compile();
    service = await module.resolve(MonthlyLunarCycleService);
  });

  const minute = moment.utc("2024-01-11T00:00:00.000Z");

  it("detects a new moon at the illumination minimum below 50", () => {
    expect.hasAssertions(); // isNewMoon: current < min(prev30) AND current <= min(next30) AND current < 50

    // Illumination reaches a local minimum of 0.5, well below the 50 threshold
    const ephemeris = createIlluminationEphemeris(minute, {
      current: 0.5,
      next: 1,
      previous: 1,
    });

    const events = service.detect({
      minute,
      moonIlluminationEphemeris: ephemeris,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.categories).toContain("Lunar");
    expect(events[0]?.categories).toContain("New");
    expect(events[0]?.summary).toContain("New Moon");
    expect(events[0]?.start).toStrictEqual(minute);
  });

  it("detects a full moon at the illumination maximum above 50", () => {
    expect.hasAssertions(); // isFullMoon: current > max(prev30) AND current >= max(next30) AND current > 50

    // Illumination reaches a local maximum of 100, well above the 50 threshold
    const ephemeris = createIlluminationEphemeris(minute, {
      current: 100,
      next: 99.5,
      previous: 99.5,
    });

    const events = service.detect({
      minute,
      moonIlluminationEphemeris: ephemeris,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.categories).toContain("Lunar");
    expect(events[0]?.categories).toContain("Full");
    expect(events[0]?.summary).toContain("Full Moon");
    expect(events[0]?.start).toStrictEqual(minute);
  });

  it("detects a first quarter moon when illumination crosses 50 while waxing", () => {
    expect.hasAssertions(); // isFirstQuarter: isWaxing (current > prev[0]) AND isCrossingUp (current > 50 AND prev[0] <= 50)

    // prev[0] is the immediately preceding minute (offset=1), checked by the service
    // next > current ensures the moon is still waxing and not at a local max (no full moon)
    const ephemeris = createIlluminationEphemeris(minute, {
      current: 50.5,
      next: 51,
      previous: 49.5,
    });

    const events = service.detect({
      minute,
      moonIlluminationEphemeris: ephemeris,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.categories).toContain("Lunar");
    expect(events[0]?.categories).toContain("First Quarter");
    expect(events[0]?.summary).toContain("First Quarter Moon");
    expect(events[0]?.start).toStrictEqual(minute);
  });

  it("detects a last quarter moon when illumination crosses 50 while waning", () => {
    expect.hasAssertions(); // isLastQuarter: isWaning (current < prev[0]) AND isCrossingDown (current < 50 AND prev[0] >= 50)

    // next < current ensures the moon is still waning and not at a local min (no new moon)
    const ephemeris = createIlluminationEphemeris(minute, {
      current: 49.5,
      next: 49,
      previous: 50.5,
    });

    const events = service.detect({
      minute,
      moonIlluminationEphemeris: ephemeris,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.categories).toContain("Lunar");
    expect(events[0]?.categories).toContain("Last Quarter");
    expect(events[0]?.summary).toContain("Last Quarter Moon");
    expect(events[0]?.start).toStrictEqual(minute);
  });

  it("returns no events when illumination is flat across the full window", () => {
    expect.hasAssertions(); // Constant illumination at 50 — not a local min/max, no threshold crossing

    const ephemeris = createIlluminationEphemeris(minute, {
      current: 50,
      next: 50,
      previous: 50,
    });

    const events = service.detect({
      minute,
      moonIlluminationEphemeris: ephemeris,
    });

    expect(events).toHaveLength(0);
  });
});
