import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { symbolByMartianPhase } from "../caelundas/symbol-caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { MartianPhaseService } from "./martian-phase.service";
import { PhaseCalculationService } from "./phase-calculation.service";
import {
  MARS_EVENING_VISIBILITY_DESCRIPTION,
  MARS_MORNING_VISIBILITY_DESCRIPTION,
} from "./phases.constants";

import type { Event } from "../calendar/calendar.types";
import type { PhaseParameters } from "./phases.types";

const createTimestamp = (): moment.Moment =>
  moment.utc("2024-06-01T06:00:00.000Z");

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
    "2024-06-01T02:00:00-04:00",
  );
  vi.mocked(phaseCalculationService.gatherPhaseParameters).mockReturnValue(
    createPhaseParameters(),
  );
  vi.mocked(phaseCalculationService.isEveningRise).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isEveningSet).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isMorningRise).mockReturnValue(false);
  vi.mocked(phaseCalculationService.isMorningSet).mockReturnValue(false);
};

const configureProgressiveUtilitiesMock = (
  progressiveUtilities: ReturnType<
    typeof createMock<ProgressiveUtilitiesService>
  >,
): void => {
  vi.mocked(progressiveUtilities.pairProgressiveEvents).mockReturnValue([]);
};

describe(MartianPhaseService, () => {
  let service: MartianPhaseService;
  let phaseCalculationService: ReturnType<
    typeof createMock<PhaseCalculationService>
  >;
  let progressiveUtilitiesService: ReturnType<
    typeof createMock<ProgressiveUtilitiesService>
  >;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MartianPhaseService,
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

    service = await module.resolve(MartianPhaseService);
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

  describe("buildMartianPhaseEvent", () => {
    it("builds expected Mars phase event metadata", () => {
      const timestamp = createTimestamp();

      const event = service.buildMartianPhaseEvent({
        phase: "morning rise",
        timestamp,
      });

      expect(event.summary).toBe(
        `♂️${symbolByMartianPhase["morning rise"]} Mars Morning Rise`,
      );
      expect(event.description).toBe("Mars Morning Rise");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
      expect(event.categories).toContain("Martian");
      expect(event.categories).toContain("Morning Rise");
    });
  });

  describe("getMartianPhaseEvents", () => {
    it("emits rise/set Mars events when all checks pass", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(true);
      phaseCalculationService.isMorningSet.mockReturnValue(true);
      phaseCalculationService.isEveningRise.mockReturnValue(true);
      phaseCalculationService.isEveningSet.mockReturnValue(true);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Mars Morning Rise",
          "Mars Morning Set",
          "Mars Evening Rise",
          "Mars Evening Set",
        ]),
      );
    });

    it("emits only morning rise when morning rise is true and others are false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(true);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Mars Morning Rise");
    });

    it("emits only morning set when morning set is true and others are false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(true);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Mars Morning Set");
    });

    it("emits only evening rise when evening rise is true and others are false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(true);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Mars Evening Rise");
    });

    it("emits only evening set when evening set is true and others are false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(true);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Mars Evening Set");
    });

    it("emits no events when all visibility checks are false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(0);
    });

    it("emits morning rise and set when both are true and evening is false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(true);
      phaseCalculationService.isMorningSet.mockReturnValue(true);
      phaseCalculationService.isEveningRise.mockReturnValue(false);
      phaseCalculationService.isEveningSet.mockReturnValue(false);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(2);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining(["Mars Morning Rise", "Mars Morning Set"]),
      );
    });

    it("emits evening rise and set when both are true and morning is false", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(false);
      phaseCalculationService.isMorningSet.mockReturnValue(false);
      phaseCalculationService.isEveningRise.mockReturnValue(true);
      phaseCalculationService.isEveningSet.mockReturnValue(true);

      const timestamp = createTimestamp();

      const events = service.getMartianPhaseEvents({
        marsCoordinateEphemeris: {},
        marsDistanceEphemeris: {},
        marsIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(2);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining(["Mars Evening Rise", "Mars Evening Set"]),
      );
    });
  });

  describe("getMartianPhaseProgressiveEvents", () => {
    it("creates martian morning visibility duration events", () => {
      const morningRise: Event = {
        categories: ["Planetary Phase", "Martian", "Morning Rise"],
        description: "Mars Morning Rise",
        end: moment.utc("2024-01-01T00:00:00.000Z"),
        start: moment.utc("2024-01-01T00:00:00.000Z"),
        summary: "Mars Morning Rise",
      };
      const morningSet: Event = {
        categories: ["Planetary Phase", "Martian", "Morning Set"],
        description: "Mars Morning Set",
        end: moment.utc("2024-01-02T00:00:00.000Z"),
        start: moment.utc("2024-01-02T00:00:00.000Z"),
        summary: "Mars Morning Set",
      };
      progressiveUtilitiesService.pairProgressiveEvents.mockReturnValue([
        [morningRise, morningSet],
      ]);

      const events = service.getMartianMorningProgressiveEvents([
        morningRise,
        morningSet,
      ]);

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe(MARS_MORNING_VISIBILITY_DESCRIPTION);
      expect(events[0]?.start).toStrictEqual(morningRise.start);
      expect(events[0]?.end).toStrictEqual(morningSet.start);
    });

    it("creates martian evening visibility duration events", () => {
      const eveningRise: Event = {
        categories: ["Planetary Phase", "Martian", "Evening Rise"],
        description: "Mars Evening Rise",
        end: moment.utc("2024-01-01T00:00:00.000Z"),
        start: moment.utc("2024-01-01T00:00:00.000Z"),
        summary: "Mars Evening Rise",
      };
      const eveningSet: Event = {
        categories: ["Planetary Phase", "Martian", "Evening Set"],
        description: "Mars Evening Set",
        end: moment.utc("2024-01-02T00:00:00.000Z"),
        start: moment.utc("2024-01-02T00:00:00.000Z"),
        summary: "Mars Evening Set",
      };
      progressiveUtilitiesService.pairProgressiveEvents.mockReturnValue([
        [eveningRise, eveningSet],
      ]);

      const events = service.getMartianEveningProgressiveEvents([
        eveningRise,
        eveningSet,
      ]);

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe(MARS_EVENING_VISIBILITY_DESCRIPTION);
      expect(events[0]?.start).toStrictEqual(eveningRise.start);
      expect(events[0]?.end).toStrictEqual(eveningSet.start);
    });
  });
});
