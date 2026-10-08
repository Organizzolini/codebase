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
  SolarEclipseType,
  TopocentricSample,
  TopocentricWindow,
} from "./eclipses.types";
import type { Moment } from "moment-timezone";

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

/** The minute nearest first contact in each test passage. */
const PASSAGE_START = moment.utc("2026-08-12T17:11:00.000Z");

/** The topocentric Moon's speed past the Sun in each test passage, degrees per minute. */
const PASSAGE_SPEED = 0.01;

/**
 * The observer's Sun and Moon during a straight passage of the Moon past
 * the Sun, `minutes` after {@link PASSAGE_START}: the Moon `crossTrack`
 * degrees north of the Sun's path, 0.527° behind it along the ecliptic at
 * the start, so the limbs of 0.26° and 0.27° discs touch just before it.
 */
function getPassageSample(args: {
  crossTrack: number;
  minutes: number;
  moonSemidiameter: number;
  sunClearance: (minutes: number) => number;
  sunSemidiameter: number;
}): TopocentricSample {
  return {
    moon: {
      clearance: 30,
      latitude: args.crossTrack,
      longitude: 100 - 0.527 + PASSAGE_SPEED * args.minutes,
      semidiameter: args.moonSemidiameter,
    },
    sun: {
      clearance: args.sunClearance(args.minutes),
      latitude: 0,
      longitude: 100,
      semidiameter: args.sunSemidiameter,
    },
  };
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
      summary: "📍 ☀️🐉▶️ Partial Solar Eclipse begins",
    };

    it("builds topocentric solar events with the local type", () => {
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
        sunAzimuthElevationEphemeris: {},
      });

      expect(events).toStrictEqual([solarBeginning]);
      expect(eclipseEventService.buildSolarEclipseEvent).toHaveBeenCalledWith({
        date: moment.utc("2026-08-12T17:11:00.000Z"),
        frame: "topocentric",
        phase: "beginning",
        type: "partial",
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
        sunAzimuthElevationEphemeris: {},
      });

      expect(events).toStrictEqual([]);
      expect(sampleSpy).not.toHaveBeenCalled();
    });
  });

  describe("local solar eclipse type", () => {
    /**
     * Sweeps a test passage minute by minute, as the perfective pass does,
     * and returns the phase and type of each local solar event it built.
     */
    function sweepPassage(args: {
      crossTrack: number;
      moonSemidiameter: number;
      sunClearance?: (minutes: number) => number;
      sunSemidiameter: number;
    }): { phase: string; type: SolarEclipseType }[] {
      const { sunClearance = (): number => 30 } = args;
      const sample = (minute: Moment): TopocentricSample =>
        getPassageSample({
          ...args,
          minutes: minute.diff(PASSAGE_START, "minutes"),
          sunClearance,
        });
      vi.spyOn(
        eclipseGeometryService,
        "getAllTopocentricSamples",
      ).mockImplementation(({ minute }) => ({
        current: sample(minute),
        next: sample(minute.clone().add(1, "minute")),
        previous: sample(minute.clone().subtract(1, "minute")),
      }));
      vi.spyOn(
        eclipseGeometryService,
        "getTopocentricSample",
      ).mockImplementation(({ minute }) => sample(minute));

      for (let minutes = -3; minutes <= 120; minutes += 1) {
        service.getTopocentricEvents({
          currentCoordinates: solarInProgress,
          isLunarMaximum: false,
          lunarEclipseType: "partial",
          minute: PASSAGE_START.clone().add(minutes, "minutes"),
          moonAzimuthElevationEphemeris: {},
          nextCoordinates: solarInProgress,
          previousCoordinates: solarInProgress,
          sunAzimuthElevationEphemeris: {},
        });
      }
      return eclipseEventService.buildSolarEclipseEvent.mock.calls.map(
        ([{ phase, type }]) => ({ phase, type }),
      );
    }

    it("is partial when the discs never fully overlap", () => {
      // The 12 August 2026 total eclipse from Philadelphia: magnitude 0.151.
      expect(
        sweepPassage({
          crossTrack: 0.3,
          moonSemidiameter: 0.27,
          sunSemidiameter: 0.26,
        }),
      ).toStrictEqual([
        { phase: "beginning", type: "partial" },
        { phase: "maximum", type: "partial" },
        { phase: "ending", type: "partial" },
      ]);
    });

    it("is total when the Moon's disc covers the Sun's", () => {
      expect(
        sweepPassage({
          crossTrack: 0.005,
          moonSemidiameter: 0.27,
          sunSemidiameter: 0.26,
        }),
      ).toStrictEqual([
        { phase: "beginning", type: "total" },
        { phase: "maximum", type: "total" },
        { phase: "ending", type: "total" },
      ]);
    });

    it("is annular when the Sun's disc rings the Moon's", () => {
      expect(
        sweepPassage({
          crossTrack: 0.005,
          moonSemidiameter: 0.25,
          sunSemidiameter: 0.26,
        }),
      ).toStrictEqual([
        { phase: "beginning", type: "annular" },
        { phase: "maximum", type: "annular" },
        { phase: "ending", type: "annular" },
      ]);
    });

    it("is partial when the Moon covers the Sun only off its rim", () => {
      // Central to within 0.015°, but the Moon is 0.01° larger: its limb
      // leaves a sliver of the Sun uncovered.
      expect(
        sweepPassage({
          crossTrack: 0.015,
          moonSemidiameter: 0.27,
          sunSemidiameter: 0.26,
        }),
      ).toStrictEqual([
        { phase: "beginning", type: "partial" },
        { phase: "maximum", type: "partial" },
        { phase: "ending", type: "partial" },
      ]);
    });

    it("is partial at both ends when the Sun sets before totality", () => {
      // The Sun's upper limb sets 30 minutes in, 23 minutes before the
      // discs are concentric.
      expect(
        sweepPassage({
          crossTrack: 0.005,
          moonSemidiameter: 0.27,
          sunClearance: (minutes) => 0.3 - PASSAGE_SPEED * minutes,
          sunSemidiameter: 0.26,
        }),
      ).toStrictEqual([
        { phase: "beginning", type: "partial" },
        { phase: "ending", type: "partial" },
      ]);
    });

    it("stays total from sunrise to last contact when the Sun rises before totality", () => {
      // The Sun's upper limb rises 45 minutes in, 8 minutes before the
      // discs are concentric.
      expect(
        sweepPassage({
          crossTrack: 0.005,
          moonSemidiameter: 0.27,
          sunClearance: (minutes) => PASSAGE_SPEED * (minutes - 45),
          sunSemidiameter: 0.26,
        }),
      ).toStrictEqual([
        { phase: "beginning", type: "total" },
        { phase: "maximum", type: "total" },
        { phase: "ending", type: "total" },
      ]);
    });

    it("judges a passage running past the ephemeris by the part it holds", () => {
      const passage = (minutes: number): TopocentricSample =>
        getPassageSample({
          crossTrack: 0.005,
          minutes,
          moonSemidiameter: 0.27,
          sunClearance: () => 30,
          sunSemidiameter: 0.26,
        });
      vi.spyOn(
        eclipseGeometryService,
        "getAllTopocentricSamples",
      ).mockReturnValueOnce({
        current: passage(0),
        next: passage(1),
        previous: passage(-1),
      });
      // The ephemeris ends 20 minutes in, long before the discs are concentric.
      vi.spyOn(
        eclipseGeometryService,
        "getTopocentricSample",
      ).mockImplementation(({ minute }) => {
        const minutes = minute.diff(PASSAGE_START, "minutes");
        return minutes > 20 ? null : passage(minutes);
      });

      service.getTopocentricEvents({
        currentCoordinates: solarInProgress,
        isLunarMaximum: false,
        lunarEclipseType: "partial",
        minute: PASSAGE_START,
        moonAzimuthElevationEphemeris: {},
        nextCoordinates: solarInProgress,
        previousCoordinates: solarInProgress,
        sunAzimuthElevationEphemeris: {},
      });

      expect(eclipseEventService.buildSolarEclipseEvent).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "beginning", type: "partial" }),
      );
    });
  });
});
