import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { TEST_TRACK_SPEED } from "../../../testing/eclipse-test.constants";
import {
  getTestContactLimit,
  getTrackWindow,
} from "../../../testing/eclipse-test.utilities";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import { EclipseCalculationService } from "./eclipse-calculation.service";
import { EclipseClassificationService } from "./eclipse-classification.service";
import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { EclipsePhase } from "../caelundas/caelundas.types";

/** Minutes on either side of closest approach that a scan covers. */
const SCAN_MINUTES = 400;

describe(EclipseCalculationService, () => {
  let service: EclipseCalculationService;
  let eclipseEventService: DeepMocked<EclipseEventService>;
  let topocentricService: DeepMocked<EclipseTopocentricService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseCalculationService,
        EclipseClassificationService,
        EclipseGeometryService,
        MathService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
        {
          provide: EclipseEventService,
          useValue: createMock<EclipseEventService>(),
        },
        {
          provide: EclipseTopocentricService,
          useValue: createMock<EclipseTopocentricService>(),
        },
      ],
    }).compile();

    service = await module.resolve(EclipseCalculationService);
    eclipseEventService = module.get(EclipseEventService);
    topocentricService = module.get(EclipseTopocentricService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  /**
   * Runs the phase classifier over every minute of a straight track and
   * returns each phase with the minutes (from closest approach) it fired at.
   */
  function scanTrack(
    kind: "lunar" | "solar",
    crossTrack: number,
    tilt = 0,
  ): Record<EclipsePhase, number[]> {
    const firedAt: Record<EclipsePhase, number[]> = {
      beginning: [],
      ending: [],
      maximum: [],
    };
    for (let minutes = -SCAN_MINUTES; minutes <= SCAN_MINUTES; minutes++) {
      const { current, next, previous } = getTrackWindow({
        crossTrack,
        kind,
        minutes,
        tilt,
      });
      const phases =
        kind === "lunar"
          ? service.getLunarEclipsePhases(current, previous, next)
          : service.getSolarEclipsePhases(current, previous, next);
      for (const phase of phases) {
        firedAt[phase].push(minutes);
      }
    }
    return firedAt;
  }

  /** Minutes from closest approach to the contact, by Pythagoras on the straight track. */
  function contactMinutes(kind: "lunar" | "solar", crossTrack: number): number {
    const limit = getTestContactLimit(kind);
    return Math.sqrt(limit ** 2 - crossTrack ** 2) / TEST_TRACK_SPEED;
  }

  describe.each(["lunar", "solar"] as const)("a %s eclipse track", (kind) => {
    it("begins at P1 and ends at P4, each on the nearest minute", () => {
      const crossTrack = 0.6;
      const firedAt = scanTrack(kind, crossTrack);
      const halfDuration = contactMinutes(kind, crossTrack);

      expect(firedAt.beginning).toStrictEqual([-Math.round(halfDuration)]);
      expect(firedAt.ending).toStrictEqual([Math.round(halfDuration)]);
    });

    it("peaks once, at closest approach", () => {
      expect(scanTrack(kind, 0.6).maximum).toStrictEqual([0]);
    });

    it("peaks at greatest eclipse, not at conjunction in longitude", () => {
      // Tilted 0.1 rad, the track meets the target's longitude
      // 0.6 · tan(0.1) / speed ≈ 7 minutes away from its closest approach.
      expect(scanTrack(kind, 0.6, 0.1).maximum).toStrictEqual([0]);
    });

    it("still begins and ends when the Moon only grazes the contact limit", () => {
      const crossTrack = getTestContactLimit(kind) - 0.01;
      const firedAt = scanTrack(kind, crossTrack);

      expect(firedAt.beginning).toHaveLength(1);
      expect(firedAt.maximum).toStrictEqual([0]);
      expect(firedAt.ending).toHaveLength(1);
    });

    it("closes an eclipse shorter than a minute", () => {
      const limit = getTestContactLimit(kind);
      const crossTrack = Math.sqrt(limit ** 2 - (TEST_TRACK_SPEED / 4) ** 2);
      const firedAt = scanTrack(kind, crossTrack);

      expect(firedAt.beginning).toHaveLength(1);
      expect(firedAt.ending).toHaveLength(1);
      expect(firedAt.ending[0]).toBeGreaterThanOrEqual(
        firedAt.beginning[0] ?? Number.NaN,
      );
    });

    it("reports nothing when the Moon passes outside the contact limit", () => {
      expect(scanTrack(kind, getTestContactLimit(kind) + 0.01)).toStrictEqual({
        beginning: [],
        ending: [],
        maximum: [],
      });
    });
  });

  describe("getGeocentricEvents", () => {
    it("builds one geocentric event per phase, solar first", () => {
      const minute = moment.utc("2026-03-03T08:44:00.000Z");
      const solarEvent = { summary: "solar" } as DetectedCalendarEvent;
      const lunarEvent = { summary: "lunar" } as DetectedCalendarEvent;
      eclipseEventService.buildSolarEclipseEvent.mockReturnValue(solarEvent);
      eclipseEventService.buildLunarEclipseEvent.mockReturnValue(lunarEvent);
      const lunarWindow = getTrackWindow({
        crossTrack: 0.6,
        kind: "lunar",
        minutes: -Math.round(contactMinutes("lunar", 0.6)),
      });

      const result = service.getGeocentricEvents({
        currentCoordinates: lunarWindow.current,
        minute,
        nextCoordinates: lunarWindow.next,
        previousCoordinates: lunarWindow.previous,
      });

      expect(result).toStrictEqual({
        events: [lunarEvent],
        lunarPhases: ["beginning"],
        lunarType: "partial",
        solarPhases: [],
        solarType: null,
      });
      expect(eclipseEventService.buildLunarEclipseEvent).toHaveBeenCalledWith({
        date: minute,
        frame: "geocentric",
        phase: "beginning",
        type: "partial",
      });
      expect(eclipseEventService.buildSolarEclipseEvent).not.toHaveBeenCalled();
    });
  });

  describe("getTopocentricEventsForDetect", () => {
    it("passes on the geocentric maximum and type, the weakest type when unknown", () => {
      const window = getTrackWindow({
        crossTrack: 0.6,
        kind: "lunar",
        minutes: 0,
      });
      const minute = moment.utc("2026-03-03T11:34:00.000Z");
      topocentricService.getTopocentricEvents.mockReturnValue([]);

      service.getTopocentricEventsForDetect({
        coordinates: {
          currentCoordinates: window.current,
          nextCoordinates: window.next,
          previousCoordinates: window.previous,
        },
        geocentricPhases: {
          lunarPhases: ["maximum"],
          lunarType: "total",
          solarPhases: ["beginning", "ending"],
          solarType: null,
        },
        minute,
        moonAzimuthElevationEphemeris: {},
        sunAzimuthElevationEphemeris: {},
      });

      expect(topocentricService.getTopocentricEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          lunarEclipseType: "total",
          lunarPhase: "maximum",
          solarEclipseType: "partial",
          solarPhase: null,
        }),
      );
    });
  });
});
