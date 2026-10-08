import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import {
  getTestContactLimit,
  getTrackCoordinates,
} from "../../../testing/eclipse-test.utilities";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type {
  EclipseCoordinates,
  TopocentricSample,
  TopocentricWindow,
} from "./eclipses.types";

/** Three consecutive minutes of one value: previous, current, next. */
type Triple = [previous: number, current: number, next: number];

/** Topocentric semidiameters of the test Sun and Moon; their limbs touch at 0.53°. */
const SUN_SEMIDIAMETER = 0.26;
const MOON_SEMIDIAMETER = 0.27;

/** Upper-limb clearance of a body high in the sky. */
const HIGH_IN_THE_SKY: Triple = [30, 30, 30];

/**
 * Three minutes of geocentric coordinates with the Moon `alongTrack`
 * degrees from the antisolar point, along the ecliptic.
 */
function getLunarCoordinates(alongTrack: Triple): {
  current: EclipseCoordinates;
  next: EclipseCoordinates;
  previous: EclipseCoordinates;
} {
  const at = (value: number): EclipseCoordinates =>
    getTrackCoordinates({ alongTrack: value, crossTrack: 0, kind: "lunar" });
  return {
    current: at(alongTrack[1]),
    next: at(alongTrack[2]),
    previous: at(alongTrack[0]),
  };
}

/**
 * Three minutes of the observer's Sun and Moon: the Moon `separations`
 * degrees east of the Sun, each body's upper limb `clearances` degrees
 * above the horizon.
 */
function getTopocentricWindow(args: {
  moonClearances?: Triple;
  separations?: Triple;
  sunClearances?: Triple;
}): TopocentricWindow {
  const {
    moonClearances = HIGH_IN_THE_SKY,
    separations = [5, 5, 5],
    sunClearances = HIGH_IN_THE_SKY,
  } = args;
  const sample = (index: 0 | 1 | 2): TopocentricSample => ({
    moon: {
      clearance: moonClearances[index],
      latitude: 0,
      longitude: 100 + separations[index],
      semidiameter: MOON_SEMIDIAMETER,
    },
    sun: {
      clearance: sunClearances[index],
      latitude: 0,
      longitude: 100,
      semidiameter: SUN_SEMIDIAMETER,
    },
  });
  return { current: sample(1), next: sample(2), previous: sample(0) };
}

describe(EclipseTopocentricService, () => {
  let service: EclipseTopocentricService;
  let eclipseGeometryService: EclipseGeometryService;
  let eclipseEventService: DeepMocked<EclipseEventService>;

  const lunarContactLimit = getTestContactLimit("lunar");

  /** The Moon's limb reaching the penumbra between the previous minute and this one, nearer this one. */
  const lunarFirstContact = getLunarCoordinates([
    -(lunarContactLimit + 0.02),
    -(lunarContactLimit - 0.01),
    -(lunarContactLimit - 0.04),
  ]);

  /** The Moon deep in the shadow for three minutes. */
  const lunarInProgress = getLunarCoordinates([-0.2, -0.19, -0.18]);

  /** A geocentric solar eclipse in progress: its penumbra lies on Earth. */
  const solarInProgress = getTrackCoordinates({
    alongTrack: 0.5,
    crossTrack: 0.2,
    kind: "solar",
  });

  /** No eclipse anywhere on Earth. */
  const noEclipse = getTrackCoordinates({
    alongTrack: 90,
    crossTrack: 10,
    kind: "solar",
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseTopocentricService,
        EclipseGeometryService,
        MathService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
        {
          provide: EclipseEventService,
          useValue: createMock<EclipseEventService>({
            buildLunarEclipseEvent:
              vi.fn<EclipseEventService["buildLunarEclipseEvent"]>(),
            buildSolarEclipseEvent:
              vi.fn<EclipseEventService["buildSolarEclipseEvent"]>(),
          }),
        },
      ],
    }).compile();

    service = await module.resolve(EclipseTopocentricService);
    eclipseGeometryService = module.get(EclipseGeometryService);
    eclipseEventService = module.get(EclipseEventService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSolarTopocentricPhases", () => {
    it("begins at the minute nearest the limbs' first contact", () => {
      // Margins −0.01°, +0.005°: the discs touch two thirds of the way to this minute.
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({ separations: [0.54, 0.525, 0.51] }),
        ),
      ).toStrictEqual(["beginning"]);
    });

    it("leaves a first contact nearer the previous minute to that minute", () => {
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({ separations: [0.535, 0.515, 0.5] }),
        ),
      ).toStrictEqual([]);
    });

    it("ends at the minute nearest the limbs' last contact", () => {
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({ separations: [0.51, 0.535, 0.56] }),
        ),
      ).toStrictEqual(["ending"]);
    });

    it("peaks where the topocentric Moon passes nearest the Sun", () => {
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({ separations: [0.3, 0.2, 0.3] }),
        ),
      ).toStrictEqual(["maximum"]);
    });

    it("reports nothing when the discs never overlap, though the eclipse is on somewhere on Earth", () => {
      // The 17 February 2026 annular from Philadelphia: the Moon passes a
      // degree from the Sun as the observer sees it.
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({ separations: [1, 0.99, 1] }),
        ),
      ).toStrictEqual([]);
    });

    it("reports nothing while the Sun is below the horizon", () => {
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({
            separations: [0.3, 0.2, 0.3],
            sunClearances: [-5, -5, -5],
          }),
        ),
      ).toStrictEqual([]);
    });

    it("begins at sunrise when the Sun rises eclipsed", () => {
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({
            separations: [0.2, 0.21, 0.22],
            sunClearances: [-0.02, 0.01, 0.04],
          }),
        ),
      ).toStrictEqual(["beginning"]);
    });

    it("ends at sunset when the Sun sets eclipsed", () => {
      expect(
        service.getSolarTopocentricPhases(
          getTopocentricWindow({
            separations: [0.2, 0.21, 0.22],
            sunClearances: [0.02, -0.01, -0.04],
          }),
        ),
      ).toStrictEqual(["ending"]);
    });
  });

  describe("getLunarTopocentricPhases", () => {
    it("begins at the geocentric first contact while the Moon is up", () => {
      expect(
        service.getLunarTopocentricPhases({
          coordinates: lunarFirstContact,
          isGeocentricMaximum: false,
          samples: getTopocentricWindow({}),
        }),
      ).toStrictEqual(["beginning"]);
    });

    it("begins at moonrise when the Moon rises eclipsed", () => {
      expect(
        service.getLunarTopocentricPhases({
          coordinates: lunarInProgress,
          isGeocentricMaximum: false,
          samples: getTopocentricWindow({ moonClearances: [-0.1, 0.01, 0.1] }),
        }),
      ).toStrictEqual(["beginning"]);
    });

    it("ends at moonset when the Moon sets eclipsed", () => {
      expect(
        service.getLunarTopocentricPhases({
          coordinates: lunarInProgress,
          isGeocentricMaximum: false,
          samples: getTopocentricWindow({ moonClearances: [0.1, -0.01, -0.1] }),
        }),
      ).toStrictEqual(["ending"]);
    });

    it("peaks at greatest eclipse only while the Moon is up", () => {
      expect(
        service.getLunarTopocentricPhases({
          coordinates: lunarInProgress,
          isGeocentricMaximum: true,
          samples: getTopocentricWindow({}),
        }),
      ).toStrictEqual(["maximum"]);
      expect(
        service.getLunarTopocentricPhases({
          coordinates: lunarInProgress,
          isGeocentricMaximum: true,
          samples: getTopocentricWindow({ moonClearances: [-1, -1, -1] }),
        }),
      ).toStrictEqual([]);
    });
  });

  describe("getTopocentricEvents", () => {
    const solarBeginning: DetectedCalendarEvent = {
      categories: ["Eclipse", "Solar"],
      description: "Solar Eclipse begins",
      end: moment.utc("2026-08-12T17:11:00.000Z"),
      start: moment.utc("2026-08-12T17:11:00.000Z"),
      summary: "📍 ☀️🐉▶️ Total Solar Eclipse begins",
    };

    it("builds topocentric events with the eclipse's type", () => {
      vi.spyOn(
        eclipseGeometryService,
        "getAllTopocentricSamples",
      ).mockReturnValueOnce(
        getTopocentricWindow({
          moonClearances: [-5, -5, -5],
          separations: [0.54, 0.525, 0.51],
        }),
      );
      eclipseEventService.buildSolarEclipseEvent.mockReturnValueOnce(
        solarBeginning,
      );

      const events = service.getTopocentricEvents({
        currentCoordinates: solarInProgress,
        isLunarMaximum: false,
        lunarEclipseType: "partial",
        minute: moment.utc("2026-08-12T17:11:00.000Z"),
        moonAzimuthElevationEphemeris: {},
        nextCoordinates: solarInProgress,
        previousCoordinates: solarInProgress,
        solarEclipseType: "total",
        sunAzimuthElevationEphemeris: {},
      });

      expect(events).toStrictEqual([solarBeginning]);
      expect(eclipseEventService.buildSolarEclipseEvent).toHaveBeenCalledWith({
        date: moment.utc("2026-08-12T17:11:00.000Z"),
        frame: "topocentric",
        phase: "beginning",
        type: "total",
      });
      expect(eclipseEventService.buildLunarEclipseEvent).not.toHaveBeenCalled();
    });

    it("skips the observer's sky entirely while no eclipse is on anywhere", () => {
      const sampleSpy = vi.spyOn(
        eclipseGeometryService,
        "getAllTopocentricSamples",
      );

      const events = service.getTopocentricEvents({
        currentCoordinates: noEclipse,
        isLunarMaximum: false,
        lunarEclipseType: "partial",
        minute: moment.utc("2026-08-12T17:11:00.000Z"),
        moonAzimuthElevationEphemeris: {},
        nextCoordinates: noEclipse,
        previousCoordinates: noEclipse,
        solarEclipseType: "total",
        sunAzimuthElevationEphemeris: {},
      });

      expect(events).toStrictEqual([]);
      expect(sampleSpy).not.toHaveBeenCalled();
    });
  });
});
