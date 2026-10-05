import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EphemerisAggregationService } from "./ephemeris-aggregation.service";
import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisHorizonService } from "./ephemeris-horizon.service";
import { EphemerisPhenomenaService } from "./ephemeris-phenomena.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import { EphemerisService } from "./ephemeris.service";

import type * as EphemerisConstantsModule from "./ephemeris.constants";
import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DiameterEphemeris,
  DistanceEphemeris,
  IlluminationEphemeris,
} from "./ephemeris.types";
import type {
  EphemerisEntries,
  EphemerisFeatureSets,
  JulianDays,
} from "./internal-ephemeris.types";
import type { Moment } from "moment-timezone";

vi.mock("./ephemeris.constants", async (importOriginal) => {
  const original = await importOriginal<typeof EphemerisConstantsModule>();
  return {
    ...original,
    initializeSwissEphemeris: vi.fn<() => void>(),
  };
});

describe(EphemerisService, () => {
  let service: EphemerisService;
  let ephemerisAggregationService: DeepMocked<EphemerisAggregationService>;
  let ephemerisCoordinateService: DeepMocked<EphemerisCoordinateService>;
  let ephemerisHorizonService: DeepMocked<EphemerisHorizonService>;
  let ephemerisPhenomenaService: DeepMocked<EphemerisPhenomenaService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EphemerisService,
        {
          provide: EphemerisAggregationService,
          useValue: createMock<EphemerisAggregationService>({
            accumulateBodyEphemeris:
              vi.fn<
                (args: {
                  allEntries: EphemerisEntries;
                  body: string;
                  end: Moment;
                  featureSets: EphemerisFeatureSets;
                  observerLatitude: number;
                  observerLongitude: number;
                  start: Moment;
                }) => void
              >(),
            buildEphemerisEntries: vi
              .fn<() => EphemerisEntries>()
              .mockReturnValue({
                azimuthEntries: [],
                coordinateEntries: [],
                diameterEntries: [],
                distanceEntries: [],
                illuminationEntries: [],
              }),
            buildEphemerisFeatureSets: vi
              .fn<
                (args: {
                  azimuthElevationBodies: string[];
                  diameterBodies: string[];
                  distanceBodies: string[];
                  illuminationBodies: string[];
                }) => EphemerisFeatureSets
              >()
              .mockReturnValue({
                azimuthElevationSet: new Set(["sun"]),
                diameterSet: new Set(["sun"]),
                distanceSet: new Set(["sun"]),
                illuminationSet: new Set(["sun"]),
              }),
            entriesToEphemerides: vi
              .fn<
                (allEntries: EphemerisEntries) => {
                  azimuthElevationEphemerisByBody: Record<
                    string,
                    AzimuthElevationEphemeris
                  >;
                  coordinateEphemerisByBody: Record<
                    string,
                    CoordinateEphemeris
                  >;
                  diameterEphemerisByBody: Record<string, DiameterEphemeris>;
                  distanceEphemerisByBody: Record<string, DistanceEphemeris>;
                  illuminationEphemerisByBody: Record<
                    string,
                    IlluminationEphemeris
                  >;
                }
              >()
              .mockReturnValue({
                azimuthElevationEphemerisByBody: {},
                coordinateEphemerisByBody: {},
                diameterEphemerisByBody: {},
                distanceEphemerisByBody: {},
                illuminationEphemerisByBody: {},
              }),
          }),
        },
        {
          provide: EphemerisCoordinateService,
          useValue: createMock<EphemerisCoordinateService>({
            computeBodyCoordinate: vi
              .fn<
                (
                  body: string,
                  julianDayEphemerisTime: number,
                ) => { latitude: number; longitude: number }
              >()
              .mockReturnValue({ latitude: -1.2, longitude: 120.5 }),
            computeDistanceForBody: vi
              .fn<
                (args: {
                  body: string;
                  end: Moment;
                  start: Moment;
                }) => DistanceEphemeris
              >()
              .mockReturnValue({
                "2024-03-21T00:00:00.000Z": { distance: 1.01 },
              }),
            computeNodeBodyMinutes: vi
              .fn<
                (args: {
                  body: string;
                  end: Moment;
                  start: Moment;
                }) => CoordinateEphemeris
              >()
              .mockReturnValue({
                "2024-03-21T00:00:00.000Z": { latitude: 0, longitude: 45 },
              }),
          }),
        },
        {
          provide: EphemerisConstantsService,
          useValue: createMock<EphemerisConstantsService>({
            isNode: vi.fn<(body: string) => boolean>(
              (body: string) =>
                body.includes("node") || body === "lunar perigee",
            ),
          }),
        },
        {
          provide: EphemerisHorizonService,
          useValue: createMock<EphemerisHorizonService>({
            computeAzimuthElevationForBody: vi
              .fn<
                (args: {
                  body: string;
                  end: Moment;
                  observerLatitude: number;
                  observerLongitude: number;
                  start: Moment;
                }) => AzimuthElevationEphemeris
              >()
              .mockReturnValue({
                "2024-03-21T00:00:00.000Z": { azimuth: 180, elevation: 44.8 },
              }),
          }),
        },
        {
          provide: EphemerisPhenomenaService,
          useValue: createMock<EphemerisPhenomenaService>({
            computeDiameterForBody: vi
              .fn<
                (args: {
                  body: string;
                  end: Moment;
                  start: Moment;
                }) => DiameterEphemeris
              >()
              .mockReturnValue({
                "2024-03-21T00:00:00.000Z": { diameter: 0.5 },
              }),
            computeIlluminationForBody: vi
              .fn<
                (args: {
                  body: string;
                  end: Moment;
                  start: Moment;
                }) => IlluminationEphemeris
              >()
              .mockReturnValue({
                "2024-03-21T00:00:00.000Z": { illumination: 75 },
              }),
          }),
        },
        {
          provide: EphemerisTimeService,
          useValue: createMock<EphemerisTimeService>({
            dateToJulianDays: vi
              .fn<(date: Moment) => JulianDays>()
              .mockReturnValue({
                julianDayEphemerisTime: 2_460_395.5,
                julianDayUniversalTime: 2_460_395.499_306,
              }),
            generateMinutes: vi.fn<
              (
                start: moment.Moment,
                end: moment.Moment,
              ) => Iterable<moment.Moment>
            >((start: moment.Moment, end: moment.Moment) => {
              const values: moment.Moment[] = [];
              let current = start.clone();
              while (current.valueOf() <= end.valueOf()) {
                values.push(current.clone());
                current = current.clone().add(1, "minute");
              }
              return values;
            }),
          }),
        },
      ],
    }).compile();

    service = await module.resolve(EphemerisService);
    ephemerisAggregationService = module.get(EphemerisAggregationService);
    ephemerisPhenomenaService = module.get(EphemerisPhenomenaService);
    ephemerisHorizonService = module.get(EphemerisHorizonService);
    ephemerisCoordinateService = module.get(EphemerisCoordinateService);
  });

  describe("accessors", () => {
    it("returns azimuth/elevation values", () => {
      const ephemeris: AzimuthElevationEphemeris = {
        "2024-03-21T00:00:00.000Z": { azimuth: 180, elevation: 44.8 },
      };

      expect(
        service.getAzimuthElevationFromEphemeris(
          ephemeris,
          "2024-03-21T00:00:00.000Z",
          "azimuth",
        ),
      ).toBe(180);
    });

    it("returns coordinate values", () => {
      const ephemeris: CoordinateEphemeris = {
        "2024-03-21T00:00:00.000Z": { latitude: -1.2, longitude: 120.5 },
      };

      expect(
        service.getCoordinateFromEphemeris(
          ephemeris,
          "2024-03-21T00:00:00.000Z",
          "longitude",
        ),
      ).toBe(120.5);
    });

    it("returns diameter values", () => {
      const ephemeris: DiameterEphemeris = {
        "2024-03-21T00:00:00.000Z": { diameter: 0.5 },
      };

      expect(
        service.getDiameterFromEphemeris(
          ephemeris,
          "2024-03-21T00:00:00.000Z",
          "diameter",
        ),
      ).toBe(0.5);
    });

    it("returns distance values", () => {
      const ephemeris: DistanceEphemeris = {
        "2024-03-21T00:00:00.000Z": { distance: 1.01 },
      };

      expect(
        service.getDistanceFromEphemeris(
          ephemeris,
          "2024-03-21T00:00:00.000Z",
          "distance",
        ),
      ).toBe(1.01);
    });

    it("returns illumination values", () => {
      const ephemeris: IlluminationEphemeris = {
        "2024-03-21T00:00:00.000Z": { illumination: 75 },
      };

      expect(
        service.getIlluminationFromEphemeris(
          ephemeris,
          "2024-03-21T00:00:00.000Z",
          "illumination",
        ),
      ).toBe(75);
    });

    it("throws when accessor timestamp is missing", () => {
      expect(() =>
        service.getCoordinateFromEphemeris({}, "missing", "longitude"),
      ).toThrow("Missing longitude at missing");
    });

    it("throws when azimuth/elevation accessor timestamp is missing", () => {
      expect(() =>
        service.getAzimuthElevationFromEphemeris({}, "missing", "elevation"),
      ).toThrow("Missing elevation at missing");
    });

    it("throws when diameter accessor timestamp is missing", () => {
      expect(() =>
        service.getDiameterFromEphemeris({}, "missing", "diameter"),
      ).toThrow("Missing diameter at missing");
    });

    it("throws when distance accessor timestamp is missing", () => {
      expect(() =>
        service.getDistanceFromEphemeris({}, "missing", "distance"),
      ).toThrow("Missing distance at missing");
    });

    it("throws when illumination accessor timestamp is missing", () => {
      expect(() =>
        service.getIlluminationFromEphemeris({}, "missing", "illumination"),
      ).toThrow("Missing illumination at missing");
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("facade delegation", () => {
    it("delegates computeAllEphemerides to aggregation service", () => {
      service.computeAllEphemerides({
        azimuthElevationBodies: ["sun"],
        coordinateBodies: ["sun"],
        coordinates: [-74.006, 40.7128],
        diameterBodies: ["sun"],
        distanceBodies: ["sun"],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        illuminationBodies: ["sun"],
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(
        ephemerisAggregationService.buildEphemerisFeatureSets,
      ).toHaveBeenCalledWith({
        azimuthElevationBodies: ["sun"],
        diameterBodies: ["sun"],
        distanceBodies: ["sun"],
        illuminationBodies: ["sun"],
      });
      expect(
        ephemerisAggregationService.accumulateBodyEphemeris,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "sun",
          end: moment.utc("2024-03-21T00:01:00.000Z"),
          featureSets: {
            azimuthElevationSet: new Set(["sun"]),
            diameterSet: new Set(["sun"]),
            distanceSet: new Set(["sun"]),
            illuminationSet: new Set(["sun"]),
          },
          observerLatitude: 40.7128,
          observerLongitude: -74.006,
          start: moment.utc("2024-03-21T00:00:00.000Z"),
        }),
      );
      expect(
        ephemerisAggregationService.entriesToEphemerides,
      ).toHaveBeenCalledWith({
        azimuthEntries: [],
        coordinateEntries: [],
        diameterEntries: [],
        distanceEntries: [],
        illuminationEntries: [],
      });
    });

    it("delegates azimuth/elevation by body to horizon service", () => {
      const result = service.getAzimuthElevationEphemerisByBody({
        bodies: ["sun"],
        coordinates: [-74.006, 40.7128],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
        timezone: "UTC",
      });

      expect(
        ephemerisHorizonService.computeAzimuthElevationForBody,
      ).toHaveBeenCalledWith({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        observerLatitude: 40.7128,
        observerLongitude: -74.006,
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });
      expect(result.sun).toBeDefined();
    });

    it("delegates illumination by body to phenomena service", () => {
      const result = service.getIlluminationEphemerisByBody({
        bodies: ["moon"],
        coordinates: [-74.006, 40.7128],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
        timezone: "UTC",
      });

      expect(
        ephemerisPhenomenaService.computeIlluminationForBody,
      ).toHaveBeenCalledWith({
        body: "moon",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });
      expect(result.moon).toBeDefined();
    });

    it("delegates diameter by body to phenomena service", () => {
      const result = service.getDiameterEphemerisByBody({
        bodies: ["sun"],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
        timezone: "UTC",
      });

      expect(
        ephemerisPhenomenaService.computeDiameterForBody,
      ).toHaveBeenCalledWith({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });
      expect(result.sun).toBeDefined();
    });

    it("delegates distance by body to coordinate service", () => {
      const result = service.getDistanceEphemerisByBody({
        bodies: ["sun"],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
        timezone: "UTC",
      });

      expect(
        ephemerisCoordinateService.computeDistanceForBody,
      ).toHaveBeenCalledWith({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });
      expect(result.sun).toBeDefined();
    });

    it("handles both node and non-node coordinate paths", () => {
      const result = service.getCoordinateEphemerisByBody({
        bodies: ["north lunar node", "sun"],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
        timezone: "UTC",
      });

      expect(
        ephemerisCoordinateService.computeNodeBodyMinutes,
      ).toHaveBeenCalledWith({
        body: "north lunar node",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });
      expect(
        ephemerisCoordinateService.computeBodyCoordinate,
      ).toHaveBeenCalledWith("sun", 2_460_395.5);
      expect(result["north lunar node"]).toBeDefined();
      expect(result.sun).toBeDefined();
    });

    it("getEphemerides delegates to computeAllEphemerides", () => {
      const spy = vi.spyOn(service, "computeAllEphemerides");
      service.getEphemerides({
        coordinates: [-74.006, 40.7128],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
        timezone: "UTC",
      });

      expect(spy).toHaveBeenCalledWith({
        azimuthElevationBodies: ["sun", "moon"],
        coordinateBodies: [
          "jupiter",
          "mars",
          "mercury",
          "moon",
          "neptune",
          "pluto",
          "saturn",
          "sun",
          "uranus",
          "venus",
          "ceres",
          "chiron",
          "juno",
          "lilith",
          "pallas",
          "vesta",
          "lunar apogee",
          "lunar perigee",
          "north lunar node",
          "south lunar node",
        ],
        coordinates: [-74.006, 40.7128],
        diameterBodies: ["sun", "moon"],
        distanceBodies: ["sun", "mercury", "venus", "mars"],
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        illuminationBodies: ["moon", "mercury", "venus", "mars"],
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });
    });
  });

  describe("getLongitudesWindow", () => {
    it("returns previous/current/next longitude values", () => {
      const ephemeris: CoordinateEphemeris = {
        "2024-03-21T00:00:00.000Z": { latitude: 0, longitude: 10 },
        "2024-03-21T00:01:00.000Z": { latitude: 0, longitude: 20 },
        "2024-03-21T00:02:00.000Z": { latitude: 0, longitude: 30 },
      };

      const result = service.getLongitudesWindow({
        ephemeris,
        minute: moment.utc("2024-03-21T00:01:00.000Z"),
        next: moment.utc("2024-03-21T00:02:00.000Z"),
        previous: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(result).toStrictEqual({ current: 20, next: 30, previous: 10 });
    });
  });
});
