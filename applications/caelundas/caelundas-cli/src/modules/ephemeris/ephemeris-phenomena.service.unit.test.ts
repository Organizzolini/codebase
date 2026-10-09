import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { pheno_ut } from "sweph";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisPhenomenaService } from "./ephemeris-phenomena.service";
import { EphemerisTimeService } from "./ephemeris-time.service";

import type * as Sweph from "sweph";

vi.mock("sweph", async (importOriginal) => {
  const original = await importOriginal<typeof Sweph>();
  return {
    ...original,
    pheno_ut: vi.fn<typeof pheno_ut>().mockReturnValue({
      data: [95, 0.75, 0, 0.5, -1.5, 0] as never,
      error: "",
      flag: 258,
    }),
  };
});

describe(EphemerisPhenomenaService, () => {
  let service: EphemerisPhenomenaService;
  let constantsService: ReturnType<
    typeof createMock<EphemerisConstantsService>
  >;
  let timeService: ReturnType<typeof createMock<EphemerisTimeService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EphemerisPhenomenaService,
        {
          provide: EphemerisConstantsService,
          useValue: createMock<EphemerisConstantsService>(),
        },
        {
          provide: EphemerisTimeService,
          useValue: createMock<EphemerisTimeService>(),
        },
      ],
    }).compile();

    service = await module.resolve(EphemerisPhenomenaService);
    constantsService = await module.resolve(EphemerisConstantsService);
    timeService = await module.resolve(EphemerisTimeService);

    vi.mocked(
      constantsService.getSwissEphemerisConstantForBody,
    ).mockReturnValue(0);
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

  describe("computeIlluminationForBody", () => {
    it("returns the constant fully lit entry for sun", () => {
      const result = service.computeIlluminationForBody({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      for (const value of Object.values(result)) {
        expect(value).toStrictEqual({
          illumination: 100,
          magnitude: -26.74,
          phaseAngle: 0,
        });
      }
    });

    it("returns pheno illumination percent, magnitude and phase angle for moon", () => {
      const result = service.computeIlluminationForBody({
        body: "moon",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      for (const value of Object.values(result)) {
        expect(value).toStrictEqual({
          illumination: 75,
          magnitude: -1.5,
          phaseAngle: 95,
        });
      }
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("computePhenoForMinute", () => {
    it("sets sun illumination without calling pheno_ut", () => {
      const illuminationEphemeris = {};
      vi.mocked(pheno_ut).mockClear();

      service.computePhenoForMinute({
        body: "sun",
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsIllumination: true,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({
        "2024-03-21T00:00:00.000Z": {
          illumination: 100,
          magnitude: -26.74,
          phaseAngle: 0,
        },
      });
      expect(pheno_ut).not.toHaveBeenCalled();
    });

    it("throws when pheno fails", () => {
      vi.mocked(pheno_ut).mockReturnValueOnce({
        data: [0, 0, 0, 0, 0],
        error: "pheno failure",
        flag: -1,
      });

      expect(() =>
        service.computePhenoForMinute({
          body: "moon",
          illuminationEphemeris: {},
          julianDayUniversalTime: 2_460_395.499_306,
          needsIllumination: true,
          swissEphemerisConstant: 0,
          timestamp: "2024-03-21T00:00:00.000Z",
        }),
      ).toThrow("pheno_ut failed for moon");
    });

    it("writes non-sun illumination from pheno", () => {
      const illuminationEphemeris = {};

      service.computePhenoForMinute({
        body: "moon",
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsIllumination: true,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({
        "2024-03-21T00:00:00.000Z": {
          illumination: 75,
          magnitude: -1.5,
          phaseAngle: 95,
        },
      });
    });

    it("writes no non-sun outputs when illumination is not requested", () => {
      const illuminationEphemeris = {};

      service.computePhenoForMinute({
        body: "moon",
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsIllumination: false,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({});
    });

    it("writes no sun outputs when illumination is not requested", () => {
      const illuminationEphemeris = {};
      vi.mocked(pheno_ut).mockClear();

      service.computePhenoForMinute({
        body: "sun",
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsIllumination: false,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({});
      expect(pheno_ut).not.toHaveBeenCalled();
    });
  });

  describe("computeIlluminationForBody error handling", () => {
    it("throws when non-sun illumination pheno fails", () => {
      vi.mocked(pheno_ut).mockReturnValueOnce({
        data: [0, 0, 0, 0, 0],
        error: "illumination failure",
        flag: -1,
      });

      expect(() =>
        service.computeIlluminationForBody({
          body: "moon",
          end: moment.utc("2024-03-21T00:01:00.000Z"),
          start: moment.utc("2024-03-21T00:00:00.000Z"),
        }),
      ).toThrow("pheno_ut failed for moon: illumination failure");
    });
  });
});
