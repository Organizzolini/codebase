import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { CalendarService } from "../calendar/calendar.service";
import { EphemerisModule } from "../ephemeris/ephemeris.module";

import { LunarApsidesService } from "./lunar-apsides.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { DistanceEphemeris } from "../ephemeris/ephemeris.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(LunarApsidesService, () => {
  let service: LunarApsidesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        {
          provide: CalendarService,
          useValue: {
            buildInstantEvent: (args: {
              categories: string[];
              date: Moment;
              description: string;
              summary: string;
            }): DetectedCalendarEvent => ({
              categories: args.categories,
              description: args.description,
              end: args.date,
              start: args.date,
              summary: args.summary,
            }),
          },
        },
        LunarApsidesService,
      ],
    }).compile();
    service = await module.resolve(LunarApsidesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const start = moment.utc("2026-01-01T21:40:00.000Z");

  /** Builds a Moon distance ephemeris for minutes 0..9 after `start` from radial speeds. */
  function createEphemeris(speeds: number[]): DistanceEphemeris {
    const ephemeris: DistanceEphemeris = {};
    for (const [index, distanceSpeed] of speeds.entries()) {
      ephemeris[start.clone().add(index, "minutes").toISOString()] = {
        distance: 0.0024,
        distanceSpeed,
      };
    }
    return ephemeris;
  }

  /** Runs the detector over every interior minute and returns the stamped minute offsets. */
  function detectOffsets(speeds: number[]): Record<string, number[]> {
    const ephemeris = createEphemeris(speeds);
    const offsetsBySummary: Record<string, number[]> = {};
    for (let index = 1; index < speeds.length - 1; index++) {
      const minute: Moment = start.clone().add(index, "minutes");
      for (const event of service.detect({
        minute,
        moonDistanceEphemeris: ephemeris,
      })) {
        (offsetsBySummary[event.summary] ??= []).push(index);
      }
    }
    return offsetsBySummary;
  }

  it("reports a lunar perigee where the radial speed turns non-negative", () => {
    expect.hasAssertions();

    const events = service.detect({
      minute: start.clone().add(2, "minutes"),
      moonDistanceEphemeris: createEphemeris([-3e-6, -2e-6, -1e-6, 2e-6, 3e-6]),
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.summary).toBe("🌙 🔥 Lunar Perigee");
    expect(events[0]?.categories).toContain("Perigee");
  });

  it("reports a lunar apogee where the radial speed turns non-positive", () => {
    expect.hasAssertions();

    const events = service.detect({
      minute: start.clone().add(2, "minutes"),
      moonDistanceEphemeris: createEphemeris([3e-6, 2e-6, 1e-6, -2e-6, -3e-6]),
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.summary).toBe("🌙 ❄️ Lunar Apogee");
    expect(events[0]?.categories).toContain("Apogee");
  });

  it("stamps the minute nearer zero, whichever side of the crossing it is", () => {
    expect.hasAssertions();

    expect(detectOffsets([-4, -3, -1, 3, 4, 5])).toStrictEqual({
      "🌙 🔥 Lunar Perigee": [2],
    });
    expect(detectOffsets([-4, -3, -3, 1, 4, 5])).toStrictEqual({
      "🌙 🔥 Lunar Perigee": [3],
    });
  });

  it("stamps an exact tie once, on the earlier minute", () => {
    expect.hasAssertions();

    expect(detectOffsets([-4, -3, -2, 2, 3, 4])).toStrictEqual({
      "🌙 🔥 Lunar Perigee": [2],
    });
  });

  it("reports a speed of exactly zero once", () => {
    expect.hasAssertions();

    expect(detectOffsets([-4, -3, -1, 0, 1, 2])).toStrictEqual({
      "🌙 🔥 Lunar Perigee": [3],
    });
  });

  it("reports nothing while the Moon keeps receding", () => {
    expect.hasAssertions();

    expect(detectOffsets([1, 2, 3, 4, 5, 6])).toStrictEqual({});
  });

  it("ignores a step in distance, which leaves the radial speed smooth", () => {
    expect.hasAssertions();

    const ephemeris = createEphemeris([1, 2, 3, 4, 5]);
    const stepped = start.clone().add(2, "minutes").toISOString();
    ephemeris[stepped] = { distance: 0.0024 - 3e-9, distanceSpeed: 3 };

    const events = service.detect({
      minute: start.clone().add(2, "minutes"),
      moonDistanceEphemeris: ephemeris,
    });

    expect(events).toHaveLength(0);
  });
});
