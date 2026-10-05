import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { symbolByMercurianPhase } from "../caelundas/symbol-caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { MercurianPhaseService } from "./mercurian-phase.service";
import { PhaseCalculationService } from "./phase-calculation.service";
import {
  MERCURY_EVENING_VISIBILITY_DESCRIPTION,
  MERCURY_MORNING_VISIBILITY_DESCRIPTION,
} from "./phases.constants";

import type { Event } from "../calendar/calendar.types";
import type { PhaseParameters } from "./phases.types";

const createTimestamp = (): moment.Moment =>
  moment.utc("2024-01-20T06:00:00.000Z");

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
    "2024-01-20T01:00:00-05:00",
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

describe(MercurianPhaseService, () => {
  let service: MercurianPhaseService;
  let phaseCalculationService: ReturnType<
    typeof createMock<PhaseCalculationService>
  >;
  let progressiveUtilitiesService: ReturnType<
    typeof createMock<ProgressiveUtilitiesService>
  >;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MercurianPhaseService,
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

    service = await module.resolve(MercurianPhaseService);
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

  describe("buildMercurianPhaseEvent", () => {
    it("builds expected Mercury phase event metadata", () => {
      const timestamp = createTimestamp();

      const event = service.buildMercurianPhaseEvent({
        phase: "morning rise",
        timestamp,
      });

      expect(event.summary).toBe(
        `☿${symbolByMercurianPhase["morning rise"]} Mercury Morning Rise`,
      );
      expect(event.description).toBe("Mercury Morning Rise");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
      expect(event.categories).toContain("Mercurian");
      expect(event.categories).toContain("Morning Rise");
    });
  });

  describe("getMercurianPhaseEvents", () => {
    it("emits all eight Mercury events when all checks pass", () => {
      phaseCalculationService.isMorningRise.mockReturnValue(true);
      phaseCalculationService.isWesternBrightest.mockReturnValue(true);
      phaseCalculationService.isWesternElongation.mockReturnValue(true);
      phaseCalculationService.isMorningSet.mockReturnValue(true);
      phaseCalculationService.isEveningRise.mockReturnValue(true);
      phaseCalculationService.isEasternElongation.mockReturnValue(true);
      phaseCalculationService.isEasternBrightest.mockReturnValue(true);
      phaseCalculationService.isEveningSet.mockReturnValue(true);

      const timestamp = createTimestamp();

      const events = service.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: {},
        mercuryDistanceEphemeris: {},
        mercuryIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(8);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Mercury Morning Rise",
          "Mercury Western Brightest",
          "Mercury Western Elongation",
          "Mercury Morning Set",
          "Mercury Evening Rise",
          "Mercury Eastern Elongation",
          "Mercury Eastern Brightest",
          "Mercury Evening Set",
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

      const events = service.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: {},
        mercuryDistanceEphemeris: {},
        mercuryIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Mercury Morning Rise");
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

      const events = service.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: {},
        mercuryDistanceEphemeris: {},
        mercuryIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe("Mercury Western Brightest");
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

      const events = service.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: {},
        mercuryDistanceEphemeris: {},
        mercuryIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Mercury Evening Rise",
          "Mercury Eastern Elongation",
          "Mercury Eastern Brightest",
          "Mercury Evening Set",
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

      const events = service.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: {},
        mercuryDistanceEphemeris: {},
        mercuryIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
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

      const events = service.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: {},
        mercuryDistanceEphemeris: {},
        mercuryIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Mercury Morning Rise",
          "Mercury Western Brightest",
          "Mercury Western Elongation",
          "Mercury Morning Set",
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

      const events = service.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: {},
        mercuryDistanceEphemeris: {},
        mercuryIlluminationEphemeris: {},
        minute: timestamp,
        sunCoordinateEphemeris: {},
      });

      expect(events).toHaveLength(4);
      expect(events.map((event) => event.description)).toStrictEqual(
        expect.arrayContaining([
          "Mercury Evening Rise",
          "Mercury Eastern Elongation",
          "Mercury Eastern Brightest",
          "Mercury Evening Set",
        ]),
      );
    });
  });

  describe("getMercurianPhaseProgressiveEvents", () => {
    it("creates mercurian morning visibility duration events", () => {
      const morningRise: Event = {
        categories: ["Planetary Phase", "Mercurian", "Morning Rise"],
        description: "Mercury Morning Rise",
        end: moment.utc("2024-01-01T00:00:00.000Z"),
        start: moment.utc("2024-01-01T00:00:00.000Z"),
        summary: "Mercury Morning Rise",
      };
      const morningSet: Event = {
        categories: ["Planetary Phase", "Mercurian", "Morning Set"],
        description: "Mercury Morning Set",
        end: moment.utc("2024-01-02T00:00:00.000Z"),
        start: moment.utc("2024-01-02T00:00:00.000Z"),
        summary: "Mercury Morning Set",
      };
      progressiveUtilitiesService.pairProgressiveEvents.mockReturnValue([
        [morningRise, morningSet],
      ]);

      const events = service.getMercurianMorningProgressiveEvents([
        morningRise,
        morningSet,
      ]);

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe(
        MERCURY_MORNING_VISIBILITY_DESCRIPTION,
      );
      expect(events[0]?.start).toStrictEqual(morningRise.start);
      expect(events[0]?.end).toStrictEqual(morningSet.start);
    });

    it("creates mercurian evening visibility duration events", () => {
      const eveningRise: Event = {
        categories: ["Planetary Phase", "Mercurian", "Evening Rise"],
        description: "Mercury Evening Rise",
        end: moment.utc("2024-01-01T00:00:00.000Z"),
        start: moment.utc("2024-01-01T00:00:00.000Z"),
        summary: "Mercury Evening Rise",
      };
      const eveningSet: Event = {
        categories: ["Planetary Phase", "Mercurian", "Evening Set"],
        description: "Mercury Evening Set",
        end: moment.utc("2024-01-02T00:00:00.000Z"),
        start: moment.utc("2024-01-02T00:00:00.000Z"),
        summary: "Mercury Evening Set",
      };
      progressiveUtilitiesService.pairProgressiveEvents.mockReturnValue([
        [eveningRise, eveningSet],
      ]);

      const events = service.getMercurianEveningProgressiveEvents([
        eveningRise,
        eveningSet,
      ]);

      expect(events).toHaveLength(1);
      expect(events[0]?.description).toBe(
        MERCURY_EVENING_VISIBILITY_DESCRIPTION,
      );
      expect(events[0]?.start).toStrictEqual(eveningRise.start);
      expect(events[0]?.end).toStrictEqual(eveningSet.start);
    });
  });
});
