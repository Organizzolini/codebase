import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { CalendarService } from "../calendar/calendar.service";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";

import { MonthlyLunarCycleService } from "./monthly-lunar-cycle.service";

import type {
  CoordinateEphemeris,
  IlluminationEphemeris,
} from "../ephemeris/ephemeris.types";

/**
 * Integration tests for lunar phase detection.
 *
 * These drive the real service, with the real calendar and ephemeris lookup
 * services and no spies, through each primary phase: the Moon's ecliptic
 * longitude minus the Sun's passing 0°, 90°, 180° and 270°. They assert the
 * full event shape — categories, summary, and timestamp.
 */

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

let service: MonthlyLunarCycleService;

/**
 * Builds Sun and Moon ephemerides for the minute before, at and after
 * `minute`, with the Moon `elongations` degrees ahead of the Sun, and a flat
 * illumination that crosses no threshold.
 */
function createEphemerides(
  minute: Moment,
  elongations: { current: number; next: number; previous: number },
): {
  moonCoordinateEphemeris: CoordinateEphemeris;
  moonIlluminationEphemeris: IlluminationEphemeris;
  sunCoordinateEphemeris: CoordinateEphemeris;
} {
  const sunLongitude = 213.4;
  const moonCoordinateEphemeris: CoordinateEphemeris = {};
  const moonIlluminationEphemeris: IlluminationEphemeris = {};
  const sunCoordinateEphemeris: CoordinateEphemeris = {};
  for (const [offset, elongation] of [
    [-1, elongations.previous],
    [0, elongations.current],
    [1, elongations.next],
  ] as const) {
    const timestamp = minute.clone().add(offset, "minutes").toISOString();
    sunCoordinateEphemeris[timestamp] = {
      latitude: 0,
      longitude: sunLongitude,
    };
    moonCoordinateEphemeris[timestamp] = {
      latitude: -4.2,
      longitude: (sunLongitude + elongation) % 360,
    };
    moonIlluminationEphemeris[timestamp] = { illumination: 40 };
  }
  return {
    moonCoordinateEphemeris,
    moonIlluminationEphemeris,
    sunCoordinateEphemeris,
  };
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

  const minute = moment.utc("2026-10-26T04:12:00.000Z");

  it.each([
    {
      category: "New",
      elongations: { current: 0.1, next: 0.6, previous: 359.6 },
      summary: "🌙 🌑 New Moon",
    },
    {
      category: "First Quarter",
      elongations: { current: 90.1, next: 90.6, previous: 89.6 },
      summary: "🌙 🌓 First Quarter Moon",
    },
    {
      category: "Full",
      elongations: { current: 180.1, next: 180.6, previous: 179.6 },
      summary: "🌙 🌕 Full Moon",
    },
    {
      category: "Last Quarter",
      elongations: { current: 270.1, next: 270.6, previous: 269.6 },
      summary: "🌙 🌗 Last Quarter Moon",
    },
  ])(
    "detects $summary when the elongation passes its longitude",
    ({ category, elongations, summary }) => {
      expect.hasAssertions();

      const events = service.detect({
        minute,
        ...createEphemerides(minute, elongations),
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toStrictEqual([
        "Astronomy",
        "Astrology",
        "Monthly Lunar Cycle",
        "Lunar",
        category,
      ]);
      expect(events[0]?.summary).toBe(summary);
      expect(events[0]?.start.toISOString()).toBe(minute.toISOString());
    },
  );

  it("returns no events when the elongation passes no phase longitude", () => {
    expect.hasAssertions();

    const events = service.detect({
      minute,
      ...createEphemerides(minute, {
        current: 120,
        next: 120.5,
        previous: 119.5,
      }),
    });

    expect(events).toHaveLength(0);
  });
});
