import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MartianPhaseService } from "./martian-phase.service";
import { MercurianPhaseService } from "./mercurian-phase.service";
import { PhasesService } from "./phases.service";
import { VenusianPhaseService } from "./venusian-phase.service";

import type { Event } from "../calendar/calendar.types";
import type { DetectPlanetaryEventsArguments } from "./phases.types";

const createEvent = (description: string, categories: string[]): Event => {
  const timestamp = moment.utc("2024-01-01T00:00:00.000Z");
  return {
    categories,
    description,
    end: timestamp,
    start: timestamp,
    summary: description,
  };
};

const createMockPhaseInputs = (): DetectPlanetaryEventsArguments => {
  const ephemeris = {
    "2024-01-01T00:00:00.000Z": {
      latitude: 0,
      longitude: 100,
    },
  };
  const distanceEphemeris = {
    "2024-01-01T00:00:00.000Z": {
      distance: 1,
    },
  };
  const illuminationEphemeris = {
    "2024-01-01T00:00:00.000Z": {
      illumination: 50,
    },
  };

  return {
    coordinateEphemerisByBody: {
      ceres: ephemeris,
      chiron: ephemeris,
      juno: ephemeris,
      jupiter: ephemeris,
      lilith: ephemeris,
      "lunar apogee": ephemeris,
      "lunar perigee": ephemeris,
      mars: ephemeris,
      mercury: ephemeris,
      moon: ephemeris,
      neptune: ephemeris,
      "north lunar node": ephemeris,
      pallas: ephemeris,
      pluto: ephemeris,
      saturn: ephemeris,
      "south lunar node": ephemeris,
      sun: ephemeris,
      uranus: ephemeris,
      venus: ephemeris,
      vesta: ephemeris,
    },
    distanceEphemerisByBody: {
      mars: distanceEphemeris,
      mercury: distanceEphemeris,
      sun: distanceEphemeris,
      venus: distanceEphemeris,
    },
    illuminationEphemerisByBody: {
      mars: illuminationEphemeris,
      mercury: illuminationEphemeris,
      moon: illuminationEphemeris,
      sun: illuminationEphemeris,
      venus: illuminationEphemeris,
    },
    minute: moment.utc("2024-01-01T00:00:00.000Z"),
  };
};

describe(PhasesService, () => {
  let service: PhasesService;
  const logger = new LoggerService();

  const venusianPhaseService = {
    getVenusianPhaseEvents:
      vi.fn<VenusianPhaseService["getVenusianPhaseEvents"]>(),
    getVenusianPhaseProgressiveEvents:
      vi.fn<VenusianPhaseService["getVenusianPhaseProgressiveEvents"]>(),
  };

  const mercurianPhaseService = {
    getMercurianPhaseEvents:
      vi.fn<MercurianPhaseService["getMercurianPhaseEvents"]>(),
    getMercurianPhaseProgressiveEvents:
      vi.fn<MercurianPhaseService["getMercurianPhaseProgressiveEvents"]>(),
  };

  const martianPhaseService = {
    getMartianPhaseEvents:
      vi.fn<MartianPhaseService["getMartianPhaseEvents"]>(),
    getMartianPhaseProgressiveEvents:
      vi.fn<MartianPhaseService["getMartianPhaseProgressiveEvents"]>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhasesService,
        {
          provide: LoggerService,
          useValue: logger,
        },
        {
          provide: VenusianPhaseService,
          useValue: venusianPhaseService,
        },
        {
          provide: MercurianPhaseService,
          useValue: mercurianPhaseService,
        },
        {
          provide: MartianPhaseService,
          useValue: martianPhaseService,
        },
      ],
    }).compile();

    service = await module.resolve(PhasesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detect", () => {
    it("delegates event detection to all planet-specific services", () => {
      venusianPhaseService.getVenusianPhaseEvents.mockReturnValue([
        createEvent("Venus Morning Rise", ["Planetary Phase", "Venusian"]),
      ]);
      mercurianPhaseService.getMercurianPhaseEvents.mockReturnValue([
        createEvent("Mercury Morning Rise", ["Planetary Phase", "Mercurian"]),
      ]);
      martianPhaseService.getMartianPhaseEvents.mockReturnValue([
        createEvent("Mars Morning Rise", ["Planetary Phase", "Martian"]),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const result = service.detect(createMockPhaseInputs());

      expect(venusianPhaseService.getVenusianPhaseEvents).toHaveBeenCalledTimes(
        1,
      );
      expect(
        mercurianPhaseService.getMercurianPhaseEvents,
      ).toHaveBeenCalledTimes(1);
      expect(martianPhaseService.getMartianPhaseEvents).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toHaveLength(3);
    });
  });

  describe("detectProgressive", () => {
    it("routes progressive events by planet category", () => {
      const venusianProgressiveEvent = createEvent("Venus Morning Star", [
        "Planetary Phase",
        "Venusian",
      ]);
      const mercurianProgressiveEvent = createEvent("Mercury Morning Star", [
        "Planetary Phase",
        "Mercurian",
      ]);
      const martianProgressiveEvent = createEvent("Mars Morning Star", [
        "Planetary Phase",
        "Martian",
      ]);

      venusianPhaseService.getVenusianPhaseProgressiveEvents.mockReturnValue([
        venusianProgressiveEvent,
      ]);
      mercurianPhaseService.getMercurianPhaseProgressiveEvents.mockReturnValue([
        mercurianProgressiveEvent,
      ]);
      martianPhaseService.getMartianPhaseProgressiveEvents.mockReturnValue([
        martianProgressiveEvent,
      ]);

      const result = service.detectProgressive([
        createEvent("Venus Morning Rise", ["Planetary Phase", "Venusian"]),
        createEvent("Mercury Morning Rise", ["Planetary Phase", "Mercurian"]),
        createEvent("Mars Morning Rise", ["Planetary Phase", "Martian"]),
        createEvent("Unrelated Event", ["Astronomy"]),
      ]);

      expect(
        venusianPhaseService.getVenusianPhaseProgressiveEvents,
      ).toHaveBeenCalledTimes(1);
      expect(
        mercurianPhaseService.getMercurianPhaseProgressiveEvents,
      ).toHaveBeenCalledTimes(1);
      expect(
        martianPhaseService.getMartianPhaseProgressiveEvents,
      ).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual([
        venusianProgressiveEvent,
        mercurianProgressiveEvent,
        martianProgressiveEvent,
      ]);
    });

    it("returns empty list when no planetary phase events are present", () => {
      venusianPhaseService.getVenusianPhaseProgressiveEvents.mockReturnValue(
        [],
      );
      mercurianPhaseService.getMercurianPhaseProgressiveEvents.mockReturnValue(
        [],
      );
      martianPhaseService.getMartianPhaseProgressiveEvents.mockReturnValue([]);

      const result = service.detectProgressive([
        createEvent("Unrelated Event", ["Astronomy"]),
      ]);

      expect(result).toStrictEqual([]);
    });
  });
});
