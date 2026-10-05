import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("sweph", () => ({
  constants: {
    SE_CERES: 17,
    SE_CHIRON: 15,
    SE_ECL2HOR: 2048,
    SE_GREG_CAL: 1,
    SE_JUNO: 19,
    SE_JUPITER: 5,
    SE_MARS: 4,
    SE_MEAN_APOG: 14,
    SE_MERCURY: 2,
    SE_MOON: 1,
    SE_NEPTUNE: 8,
    SE_NODBIT_OSCU: 2,
    SE_OSCU_APOG: 22,
    SE_PALLAS: 18,
    SE_PLUTO: 9,
    SE_SATURN: 6,
    SE_SUN: 0,
    SE_TRUE_NODE: 11,
    SE_URANUS: 7,
    SE_VENUS: 3,
    SE_VESTA: 20,
    SEFLG_SPEED: 256,
    SEFLG_SWIEPH: 2,
  },
  set_ephe_path: vi.fn<(path: string) => void>(),
}));

import {
  ECLIPTIC_TO_HORIZONTAL_FLAG,
  GREGORIAN_CALENDAR_FLAG,
  initializeSwissEphemeris,
  OSCULATING_ORBITAL_ELEMENTS_FLAG,
  SWISS_EPHEMERIS_FLAGS,
  swissEphemerisConstantByAsteroid,
  swissEphemerisConstantByNode,
  swissEphemerisConstantByPlanet,
} from "./ephemeris.constants";

describe("ephemeris.constants", () => {
  describe("flags", () => {
    it("maps ECLIPTIC_TO_HORIZONTAL_FLAG to SE_ECL2HOR", () => {
      expect(ECLIPTIC_TO_HORIZONTAL_FLAG).toBe(2048);
    });

    it("maps GREGORIAN_CALENDAR_FLAG to SE_GREG_CAL", () => {
      expect(GREGORIAN_CALENDAR_FLAG).toBe(1);
    });

    it("maps OSCULATING_ORBITAL_ELEMENTS_FLAG to SE_NODBIT_OSCU", () => {
      expect(OSCULATING_ORBITAL_ELEMENTS_FLAG).toBe(2);
    });

    it("combines SWISS_EPHEMERIS_FLAGS from SEFLG_SWIEPH | SEFLG_SPEED", () => {
      expect(SWISS_EPHEMERIS_FLAGS).toBe(2 | 256);
    });
  });

  describe("swissEphemerisConstantByPlanet", () => {
    it("maps sun to SE_SUN", () => {
      expect(swissEphemerisConstantByPlanet.sun).toBe(0);
    });

    it("maps moon to SE_MOON", () => {
      expect(swissEphemerisConstantByPlanet.moon).toBe(1);
    });

    it("maps mercury to SE_MERCURY", () => {
      expect(swissEphemerisConstantByPlanet.mercury).toBe(2);
    });

    it("maps venus to SE_VENUS", () => {
      expect(swissEphemerisConstantByPlanet.venus).toBe(3);
    });

    it("maps mars to SE_MARS", () => {
      expect(swissEphemerisConstantByPlanet.mars).toBe(4);
    });

    it("maps jupiter to SE_JUPITER", () => {
      expect(swissEphemerisConstantByPlanet.jupiter).toBe(5);
    });

    it("maps saturn to SE_SATURN", () => {
      expect(swissEphemerisConstantByPlanet.saturn).toBe(6);
    });

    it("maps uranus to SE_URANUS", () => {
      expect(swissEphemerisConstantByPlanet.uranus).toBe(7);
    });

    it("maps neptune to SE_NEPTUNE", () => {
      expect(swissEphemerisConstantByPlanet.neptune).toBe(8);
    });

    it("maps pluto to SE_PLUTO", () => {
      expect(swissEphemerisConstantByPlanet.pluto).toBe(9);
    });

    it("covers all 10 planets", () => {
      expect(Object.keys(swissEphemerisConstantByPlanet)).toHaveLength(10);
    });
  });

  describe("swissEphemerisConstantByAsteroid", () => {
    it("maps chiron to SE_CHIRON", () => {
      expect(swissEphemerisConstantByAsteroid.chiron).toBe(15);
    });

    it("maps lilith to SE_MEAN_APOG", () => {
      expect(swissEphemerisConstantByAsteroid.lilith).toBe(14);
    });

    it("maps ceres to SE_CERES", () => {
      expect(swissEphemerisConstantByAsteroid.ceres).toBe(17);
    });

    it("maps pallas to SE_PALLAS", () => {
      expect(swissEphemerisConstantByAsteroid.pallas).toBe(18);
    });

    it("maps juno to SE_JUNO", () => {
      expect(swissEphemerisConstantByAsteroid.juno).toBe(19);
    });

    it("maps vesta to SE_VESTA", () => {
      expect(swissEphemerisConstantByAsteroid.vesta).toBe(20);
    });

    it("covers all 6 asteroids", () => {
      expect(Object.keys(swissEphemerisConstantByAsteroid)).toHaveLength(6);
    });
  });

  describe("swissEphemerisConstantByNode", () => {
    it("maps north lunar node to SE_TRUE_NODE", () => {
      expect(swissEphemerisConstantByNode["north lunar node"]).toBe(11);
    });

    it("maps south lunar node to SE_TRUE_NODE", () => {
      expect(swissEphemerisConstantByNode["south lunar node"]).toBe(11);
    });

    it("uses the same constant for north and south lunar node", () => {
      expect(swissEphemerisConstantByNode["north lunar node"]).toBe(
        swissEphemerisConstantByNode["south lunar node"],
      );
    });

    it("maps lunar apogee to SE_OSCU_APOG", () => {
      expect(swissEphemerisConstantByNode["lunar apogee"]).toBe(22);
    });

    it("maps lunar perigee to null", () => {
      expect(swissEphemerisConstantByNode["lunar perigee"]).toBeNull();
    });

    it("covers all 4 nodes", () => {
      expect(Object.keys(swissEphemerisConstantByNode)).toHaveLength(4);
    });
  });

  describe(initializeSwissEphemeris, () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("calls set_ephe_path with the ephemeris data directory", async () => {
      const { set_ephe_path: setEphemerisPath } = await import("sweph");

      initializeSwissEphemeris();

      expect(setEphemerisPath).toHaveBeenCalledWith("./data/ephemeris");
    });

    it("calls set_ephe_path exactly once", async () => {
      const { set_ephe_path: setEphemerisPath } = await import("sweph");

      initializeSwissEphemeris();

      expect(setEphemerisPath).toHaveBeenCalledWith("./data/ephemeris");
    });
  });
});
