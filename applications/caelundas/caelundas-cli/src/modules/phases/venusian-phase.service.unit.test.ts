import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { symbolByVenusianPhase } from "../caelundas/symbol-caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { PhaseCalculationService } from "./phase-calculation.service";
import {
  VENUS_EVENING_VISIBILITY_DESCRIPTION,
  VENUS_MORNING_VISIBILITY_DESCRIPTION,
} from "./phases.constants";
import { VenusianPhaseService } from "./venusian-phase.service";

import type { Event } from "../calendar/calendar.types";
import type { PhaseParameters } from "./phases.types";

const createTimestamp = (): moment.Moment =>
  moment.utc("2024-01-15T06:00:00.000Z");

const createPhaseParameters = (): PhaseParameters => ({
  currentDistance: 1,
  currentIllumination: 50,
  currentLongitudePlanet: 100,
  currentLongitudeSun: 90,
  nextDistances: [1, 1],
  nextIlluminations: [50, 50],
  nextLongitudePlanet: 101,
  nextLongitudeSun: 91,
  previousDistances: [1, 1],
  previousIlluminations: [50, 50],
  previousLongitudePlanet: 99,
  previousLongitudeSun: 89,
});

const configurePhaseCalculationServiceMock = (
  phaseCalculationService: ReturnType<
    typeof createMock<PhaseCalculationService>
  >,
): void => {
  vi.mocked(phaseCalculationService.filterByCategory).mockImplementation(
    (events: Event[], category: string) =>
      events.filter((event) => event.categories.includes(category)),
  );
  vi.mocked(phaseCalculationService.formatTimeZoneIso).mockReturnValue(
    "2024-01-15T01:00:00-05:00",
  );
  vi.mocked(phaseCalculationService.gatherPhaseParameters).mockReturnValue(
    createPhaseParameters(),
  );
  vi.mocked(phaseCalculationService.isEasternBrightest).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isEasternElongation).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isEveningRise).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isEveningSet).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isMorningRise).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isMorningSet).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isWesternBrightest).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isWesternElongation).mockReturnValue(false);
};

const configureProgressiveUtilitiesMock = (
  progressiveUtilities: ReturnType<
    typeof createMock<ProgressiveUtilitiesService>
  >,
): void => {
  vi.mocked(progressiveUtilities.pairProgressiveEvents).mockReturnValue([]);
};

describe(VenusianPhaseService, () => {
  let service: VenusianPhaseService;
  let phaseCalculationService: ReturnType<
    typeof createMock<PhaseCalculationService>
  >;
  let progressiveUtilitiesService: ReturnType<
    typeof createMock<ProgressiveUtilitiesService>
  >;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        VenusianPhaseService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: PhaseCalculationService,
          useValue: createMock<PhaseCalculationService>(),
        },
        {
          provide: ProgressiveUtilitiesService,
          useValue: createMock<ProgressiveUtilitiesService>(),
        },
      ],
    }).compile();

    service = await module.resolve(VenusianPhaseService);
    await module.resolve(LoggerService);
    phaseCalculationService = await module.resolve(PhaseCalculationService);
    progressiveUtilitiesService = await module.resolve(
      ProgressiveUtilitiesService,
    );

    configurePhaseCalculationServiceMock(phaseCalculationService);
    configureProgressiveUtilitiesMock(progressiveUtilitiesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildVenusianPhaseEvent", () => {
    it("builds expected Venus phase event metadata", () => {
      const timestamp = createTimestamp();

      const event = service.buildVenusianPhaseEvent({
        phase: "morning rise",
        timestamp,
      });

      expect(event.summary).toBe(
        `♀️${symbolByVenusianPhase["morning rise"]} Venus Morning Rise`,
      );
      expect(event.description).toBe("Venus Morning Rise");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
      expect(event.categories).toContain("Venusian");
      expect(event.categories).toContain("Morning Rise");
    });
  });

  describe("getVenusianPhaseEvents", () => {
    it("emits all eight Venus events when all checks pass", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(true);
      phaseCalculationService.isWesternBrightest.mockReturnValue(true);
      phaseCalculationService.isWesternElongation.mockReturnValue(true);
      phaseCalculationService.isMorningSet.mockReturnValue(true);
      phaseCalculationService.isEveningRise.mockReturnValue(true);
      phaseCalculationService.isEasternElongation.mockReturnValue(true);
      phaseCalculationService.isEasternBrightest.mockReturnValue(true);
      phaseCalculationService.isEveningSet.mockReturnValue(true);

      const timestamp = createTimestamp();

      const events = service.getVenusianPhaseEvents({
        minute: timestamp,
        sunCoordinateEphemeris: {},
        venusCoordinateEphemeris: {},
        venusDistanceEphemeris: {},
        venusIlluminationEphemeris: {},
      });

      expect(events).toHaveLength(8);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Venus Morning Rise",
          "Venus Western Brightest",
          "Venus Western Elongation",
          "Venus Morning Set",
          "Venus Evening Rise",
          "Venus Eastern Elongation",
          "Venus Eastern Brightest",
          "Venus Evening Set",
        ]),
      );
    });

    it("emits only morning rise when only morning rise is true", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(true);
      phaseCalculationService.isWesternBrightest.mockReturnValue(false);
      phaseCalculationService.isWesternElongation.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEasternElongation.mockReturnValue(false);
      phaseCalculationService.isEasternBrightest.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getVenusianPhaseEvents({
        minute: timestamp,
        sunCoordinateEphemeris: {},
        venusCoordinateEphemeris: {},
        venusDistanceEphemeris: {},
        venusIlluminationEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Venus Morning Rise");
    });

    it("emits only western brightest when only western brightest is true", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isWesternBrightest.mockReturnValue(true);
      phaseCalculationService.isWesternElongation.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEasternElongation.mockReturnValue(false);
      phaseCalculationService.isEasternBrightest.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getVenusianPhaseEvents({
        minute: timestamp,
        sunCoordinateEphemeris: {},
        venusCoordinateEphemeris: {},
        venusDistanceEphemeris: {},
        venusIlluminationEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Venus Western Brightest");
    });

    it("emits only evening events when only evening conditions are true", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isWesternBrightest.mockReturnValue(false);
      phaseCalculationService.isWesternElongation.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(true);
      phaseCalculationService.isEasternElongation.mockReturnValue(true);
      phaseCalculationService.isEasternBrightest.mockReturnValue(true);
      phaseCalculationService.isEveningSet.mockReturnValue(true);

      const timestamp = createTimestamp();

      const events = service.getVenusianPhaseEvents({
        minute: timestamp,
        sunCoordinateEphemeris: {},
        venusCoordinateEphemeris: {},
        venusDistanceEphemeris: {},
        venusIlluminationEphemeris: {},
      });

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Venus Evening Rise",
          "Venus Eastern Elongation",
          "Venus Eastern Brightest",
          "Venus Evening Set",
        ]),
      );
    });

    it("emits no events when all visibility checks are false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isWesternBrightest.mockReturnValue(false);
      phaseCalculationService.isWesternElongation.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEasternElongation.mockReturnValue(false);
      phaseCalculationService.isEasternBrightest.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getVenusianPhaseEvents({
        minute: timestamp,
        sunCoordinateEphemeris: {},
        venusCoordinateEphemeris: {},
        venusDistanceEphemeris: {},
        venusIlluminationEphemeris: {},
      });

      expect(events).toHaveLength(0);
    });

    it("emits western sequence when all western events are true", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(true);
      phaseCalculationService.isWesternBrightest.mockReturnValue(true);
      phaseCalculationService.isWesternElongation.mockReturnValue(true);
      phaseCalculationService.isMorningSet.mockReturnValue(true);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEasternElongation.mockReturnValue(false);
      phaseCalculationService.isEasternBrightest.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getVenusianPhaseEvents({
        minute: timestamp,
        sunCoordinateEphemeris: {},
        venusCoordinateEphemeris: {},
        venusDistanceEphemeris: {},
        venusIlluminationEphemeris: {},
      });

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Venus Morning Rise",
          "Venus Western Brightest",
          "Venus Western Elongation",
          "Venus Morning Set",
        ]),
      );
    });

    it("emits eastern sequence when all eastern events are true", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isWesternBrightest.mockReturnValue(false);
      phaseCalculationService.isWesternElongation.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(true);
      phaseCalculationService.isEasternElongation.mockReturnValue(true);
      phaseCalculationService.isEasternBrightest.mockReturnValue(true);
      phaseCalculationService.isEveningSet.mockReturnValue(true);

      const timestamp = createTimestamp();

      const events = service.getVenusianPhaseEvents({
        minute: timestamp,
        sunCoordinateEphemeris: {},
        venusCoordinateEphemeris: {},
        venusDistanceEphemeris: {},
        venusIlluminationEphemeris: {},
      });

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Venus Evening Rise",
          "Venus Eastern Elongation",
          "Venus Eastern Brightest",
          "Venus Evening Set",
        ]),
      );
    });
  });

  describe("getVenusianPhaseProgressiveEvents", () => {
    it("creates venusian morning visibility duration events", () => {
      const morningRise: Event = {
        categories: ["Planetary Phase", "Venusian", "Morning Rise"],
        description: "Venus Morning Rise",
        end: moment.utc("2024-01-01T00:00:00.000Z"),
        start: moment.utc("2024-01-01T00:00:00.000Z"),
        summary: "Venus Morning Rise",
      };
      const morningSet: Event = {
        categories: ["Planetary Phase", "Venusian", "Morning Set"],
        description: "Venus Morning Set",
        end: moment.utc("2024-01-02T00:00:00.000Z"),
        start: moment.utc("2024-01-02T00:00:00.000Z"),
        summary: "Venus Morning Set",
      };
      progressiveUtilitiesService.pairProgressiveEvents.mockReturnValue([
        [morningRise, morningSet],
      ]);

      const events = service.getVenusianMorningProgressiveEvents([
        morningRise,
        morningSet,
      ]);

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe(VENUS_MORNING_VISIBILITY_DESCRIPTION);
      expect(events[0]?.start).toStrictEqual(morningRise.start);
      expect(events[0]?.end).toStrictEqual(morningSet.start);
    });

    it("creates venusian evening visibility duration events", () => {
      const eveningRise: Event = {
        categories: ["Planetary Phase", "Venusian", "Evening Rise"],
        description: "Venus Evening Rise",
        end: moment.utc("2024-01-01T00:00:00.000Z"),
        start: moment.utc("2024-01-01T00:00:00.000Z"),
        summary: "Venus Evening Rise",
      };
      const eveningSet: Event = {
        categories: ["Planetary Phase", "Venusian", "Evening Set"],
        description: "Venus Evening Set",
        end: moment.utc("2024-01-02T00:00:00.000Z"),
        start: moment.utc("2024-01-02T00:00:00.000Z"),
        summary: "Venus Evening Set",
      };
      progressiveUtilitiesService.pairProgressiveEvents.mockReturnValue([
        [eveningRise, eveningSet],
      ]);

      const events = service.getVenusianEveningProgressiveEvents([
        eveningRise,
        eveningSet,
      ]);

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe(VENUS_EVENING_VISIBILITY_DESCRIPTION);
      expect(events[0]?.start).toStrictEqual(eveningRise.start);
      expect(events[0]?.end).toStrictEqual(eveningSet.start);
    });
  });
});
