import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EphemerisAggregationService } from "./ephemeris-aggregation.service";
import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisHorizonService } from "./ephemeris-horizon.service";
import { EphemerisPhenomenaService } from "./ephemeris-phenomena.service";
import { EphemerisTimeService } from "./ephemeris-time.service";

describe(EphemerisAggregationService, () => {
  let service: EphemerisAggregationService;
  let constantsService: ReturnType<
    typeof createMock<EphemerisConstantsService>
  >;
  let coordinateService: ReturnType<
    typeof createMock<EphemerisCoordinateService>
  >;
  let horizonService: ReturnType<typeof createMock<EphemerisHorizonService>>;
  let timeService: ReturnType<typeof createMock<EphemerisTimeService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EphemerisAggregationService,
        {
          provide: EphemerisConstantsService,
          useValue: createMock<EphemerisConstantsService>(),
        },
        {
          provide: EphemerisCoordinateService,
          useValue: createMock<EphemerisCoordinateService>(),
        },
        {
          provide: EphemerisHorizonService,
          useValue: createMock<EphemerisHorizonService>(),
        },
        {
          provide: EphemerisPhenomenaService,
          useValue: createMock<EphemerisPhenomenaService>(),
        },
        {
          provide: EphemerisTimeService,
          useValue: createMock<EphemerisTimeService>(),
        },
      ],
    }).compile();

    service = await module.resolve(EphemerisAggregationService);
    constantsService = await module.resolve(EphemerisConstantsService);
    coordinateService = await module.resolve(EphemerisCoordinateService);
    horizonService = await module.resolve(EphemerisHorizonService);
    timeService = await module.resolve(EphemerisTimeService);

    vi.mocked(
      constantsService.getSwissEphemerisConstantForBody,
    ).mockReturnValue(0);
    vi.mocked(constantsService.isNode).mockImplementation(
      (body: string) => body.includes("node") || body === "lunar perigee",
    );
    vi.mocked(coordinateService.computeNodeBodyMinutes).mockReturnValue({
      "2024-03-21T00:00:00.000Z": { latitude: 0, longitude: 45 },
    });
    vi.mocked(coordinateService.getBodyCoordinatesWithDistance).mockReturnValue(
      {
        distance: 1.01,
        latitude: -1.2,
        longitude: 120.5,
      },
    );
    vi.mocked(horizonService.computeAzimuthElevationForMinute).mockReturnValue({
      azimuth: 180,
      elevation: 44.8,
    });
    vi.mocked(timeService.dateToJulianDays).mockReturnValue({
      julianDayEphemerisTime: 2_460_395.5,
      julianDayUniversalTime: 2_460_395.499_306,
    });
    vi.mocked(timeService.generateMinutes).mockImplementation(
      (start: moment.Moment, end: moment.Moment) => {
        const values: moment.Moment[] = [];
        let current = start.clone();
        while (current.valueOf() <= end.valueOf()) {
          values.push(current.clone());
          current = current.clone().add(1, "minute");
        }
        return values;
      },
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildEphemerisFeatureSets", () => {
    it("creates body lookup sets", () => {
      const result = service.buildEphemerisFeatureSets({
        azimuthElevationBodies: ["sun"],
        diameterBodies: ["moon"],
        distanceBodies: ["sun"],
        illuminationBodies: ["moon"],
      });

      expect(result.azimuthElevationSet.has("sun")).toBe(true);
      expect(result.diameterSet.has("moon")).toBe(true);
      expect(result.distanceSet.has("sun")).toBe(true);
      expect(result.illuminationSet.has("moon")).toBe(true);
    });
  });

  describe("buildEphemerisEntries", () => {
    it("creates empty entry arrays", () => {
      const result = service.buildEphemerisEntries();

      expect(result.azimuthEntries).toHaveLength(0);
      expect(result.coordinateEntries).toHaveLength(0);
      expect(result.diameterEntries).toHaveLength(0);
      expect(result.distanceEntries).toHaveLength(0);
      expect(result.illuminationEntries).toHaveLength(0);
    });
  });

  describe("accumulateBodyEphemeris", () => {
    it("accumulates node coordinates through node path", () => {
      const allEntries = service.buildEphemerisEntries();
      const featureSets = service.buildEphemerisFeatureSets({
        azimuthElevationBodies: [],
        diameterBodies: [],
        distanceBodies: [],
        illuminationBodies: [],
      });

      service.accumulateBodyEphemeris({
        allEntries,
        body: "north lunar node",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        featureSets,
        observerLatitude: 40.7128,
        observerLongitude: -74.006,
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(allEntries.coordinateEntries).toHaveLength(1);
      expect(coordinateService.computeNodeBodyMinutes).toHaveBeenCalledWith({
        body: "north lunar node",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });
    });

    it("accumulates non-node coordinate and requested feature entries", () => {
      const allEntries = service.buildEphemerisEntries();
      const featureSets = service.buildEphemerisFeatureSets({
        azimuthElevationBodies: ["sun"],
        diameterBodies: ["sun"],
        distanceBodies: ["sun"],
        illuminationBodies: ["sun"],
      });

      service.accumulateBodyEphemeris({
        allEntries,
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        featureSets,
        observerLatitude: 40.7128,
        observerLongitude: -74.006,
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(allEntries.coordinateEntries).toHaveLength(1);
      expect(allEntries.azimuthEntries).toHaveLength(1);
      expect(allEntries.diameterEntries).toHaveLength(1);
      expect(allEntries.distanceEntries).toHaveLength(1);
      expect(allEntries.illuminationEntries).toHaveLength(1);
    });

    it("skips optional ephemeris entries when no feature sets are requested", () => {
      const allEntries = service.buildEphemerisEntries();
      const featureSets = service.buildEphemerisFeatureSets({
        azimuthElevationBodies: [],
        diameterBodies: [],
        distanceBodies: [],
        illuminationBodies: [],
      });

      service.accumulateBodyEphemeris({
        allEntries,
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        featureSets,
        observerLatitude: 40.7128,
        observerLongitude: -74.006,
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(allEntries.coordinateEntries).toHaveLength(1);
      expect(allEntries.azimuthEntries).toHaveLength(0);
      expect(allEntries.diameterEntries).toHaveLength(0);
      expect(allEntries.distanceEntries).toHaveLength(0);
      expect(allEntries.illuminationEntries).toHaveLength(0);
      expect(
        horizonService.computeAzimuthElevationForMinute,
      ).not.toHaveBeenCalled();
    });
  });

  describe("entriesToEphemerides", () => {
    it("converts entries arrays into by-body records", () => {
      const entries = service.buildEphemerisEntries();
      entries.coordinateEntries.push([
        "sun",
        { "2024-03-21T00:00:00.000Z": { latitude: -1.2, longitude: 120.5 } },
      ]);

      const result = service.entriesToEphemerides(entries);

      expect(result.coordinateEphemerisByBody.sun).toBeDefined();
    });
  });
});
