import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisHorizonService } from "./ephemeris-horizon.service";
import { EphemerisTimeService } from "./ephemeris-time.service";

import type { azalt } from "sweph";
import type * as Sweph from "sweph";

vi.mock("sweph", async (importOriginal) => {
  const original = await importOriginal<typeof Sweph>();
  return {
    ...original,
    azalt: vi
      .fn<(...args: Parameters<typeof azalt>) => ReturnType<typeof azalt>>()
      .mockReturnValue([180, 45, 44.8]),
  };
});

describe(EphemerisHorizonService, () => {
  let service: EphemerisHorizonService;
  let coordinateService: ReturnType<
    typeof createMock<EphemerisCoordinateService>
  >;
  let timeService: ReturnType<typeof createMock<EphemerisTimeService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EphemerisHorizonService,
        {
          provide: EphemerisCoordinateService,
          useValue: createMock<EphemerisCoordinateService>(),
        },
        {
          provide: EphemerisTimeService,
          useValue: createMock<EphemerisTimeService>(),
        },
      ],
    }).compile();

    service = await module.resolve(EphemerisHorizonService);
    coordinateService = await module.resolve(EphemerisCoordinateService);
    timeService = await module.resolve(EphemerisTimeService);

    vi.mocked(coordinateService.getBodyCoordinatesWithDistance).mockReturnValue(
      {
        distance: 1.01,
        latitude: -1.2,
        longitude: 120.5,
      },
    );
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

  describe("computeAzimuthElevationForMinute", () => {
    it("returns azimuth/elevation from sweph azalt", () => {
      const result = service.computeAzimuthElevationForMinute({
        body: "sun",
        distance: 1.01,
        julianDayUniversalTime: 2_460_395.499_306,
        latitude: -1.2,
        longitude: 120.5,
        observerLatitude: 40.7128,
        observerLongitude: -74.006,
      });

      expect(result).toStrictEqual({ azimuth: 180, elevation: 44.8 });
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("computeAzimuthElevationForBody", () => {
    it("returns minute-by-minute azimuth/elevation ephemeris", () => {
      const result = service.computeAzimuthElevationForBody({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        observerLatitude: 40.7128,
        observerLongitude: -74.006,
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(Object.keys(result)).toHaveLength(2);

      for (const value of Object.values(result)) {
        expect(value.azimuth).toBe(180);
        expect(value.elevation).toBe(44.8);
      }
    });
  });
});
