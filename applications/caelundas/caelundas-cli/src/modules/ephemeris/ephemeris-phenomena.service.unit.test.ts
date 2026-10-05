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
      data: [0, 0.75, 0, 0.5, 0, 0] as never,
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
    it("returns 100 for sun", () => {
      const result = service.computeIlluminationForBody({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      for (const value of Object.values(result)) {
        expect(value.illumination).toBe(100);
      }
    });

    it("returns pheno illumination percent for moon", () => {
      const result = service.computeIlluminationForBody({
        body: "moon",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      for (const value of Object.values(result)) {
        expect(value.illumination).toBe(75);
      }
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("computeDiameterForBody", () => {
    it("returns diameter from pheno data[3]", () => {
      const result = service.computeDiameterForBody({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      for (const value of Object.values(result)) {
        expect(value.diameter).toBe(0.5);
      }
    });

    it("throws when pheno diameter calculation fails", () => {
      vi.mocked(pheno_ut).mockReturnValueOnce({
        data: [0, 0, 0, 0, 0],
        error: "diameter failure",
        flag: -1,
      });

      expect(() =>
        service.computeDiameterForBody({
          body: "moon",
          end: moment.utc("2024-03-21T00:01:00.000Z"),
          start: moment.utc("2024-03-21T00:00:00.000Z"),
        }),
      ).toThrow("pheno_ut failed for moon: diameter failure");
    });
  });

  describe("computePhenoForMinute", () => {
    it("sets sun illumination and diameter", () => {
      const illuminationEphemeris = {};
      const diameterEphemeris = {};
      service.computePhenoForMinute({
        body: "sun",
        diameterEphemeris,
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsDiameter: true,
        needsIllumination: true,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({
        "2024-03-21T00:00:00.000Z": { illumination: 100 },
      });
      expect(diameterEphemeris).toStrictEqual({
        "2024-03-21T00:00:00.000Z": { diameter: 0.5 },
      });
    });

    it("throws when sun diameter calculation fails", () => {
      vi.mocked(pheno_ut).mockReturnValueOnce({
        data: [0, 0, 0, 0, 0],
        error: "sun diameter failure",
        flag: -1,
      });

      expect(() =>
        service.computePhenoForMinute({
          body: "sun",
          diameterEphemeris: {},
          illuminationEphemeris: {},
          julianDayUniversalTime: 2_460_395.499_306,
          needsDiameter: true,
          needsIllumination: true,
          swissEphemerisConstant: 0,
          timestamp: "2024-03-21T00:00:00.000Z",
        }),
      ).toThrow("pheno_ut failed for sun: sun diameter failure");
    });

    it("writes only sun illumination when diameter is not requested", () => {
      const illuminationEphemeris = {};
      const diameterEphemeris = {};

      service.computePhenoForMinute({
        body: "sun",
        diameterEphemeris,
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsDiameter: false,
        needsIllumination: true,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({
        "2024-03-21T00:00:00.000Z": { illumination: 100 },
      });
      expect(diameterEphemeris).toStrictEqual({});
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
          diameterEphemeris: {},
          illuminationEphemeris: {},
          julianDayUniversalTime: 2_460_395.499_306,
          needsDiameter: true,
          needsIllumination: true,
          swissEphemerisConstant: 0,
          timestamp: "2024-03-21T00:00:00.000Z",
        }),
      ).toThrow("pheno_ut failed for moon");
    });

    it("writes only requested non-sun outputs for pheno", () => {
      const illuminationEphemeris = {};
      const diameterEphemeris = {};

      service.computePhenoForMinute({
        body: "moon",
        diameterEphemeris,
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsDiameter: false,
        needsIllumination: true,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({
        "2024-03-21T00:00:00.000Z": { illumination: 75 },
      });
      expect(diameterEphemeris).toStrictEqual({});
    });

    it("writes diameter only when illumination is not requested", () => {
      const illuminationEphemeris = {};
      const diameterEphemeris = {};

      service.computePhenoForMinute({
        body: "moon",
        diameterEphemeris,
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsDiameter: true,
        needsIllumination: false,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({});
      expect(diameterEphemeris).toStrictEqual({
        "2024-03-21T00:00:00.000Z": { diameter: 0.5 },
      });
    });

    it("writes no sun outputs when neither illumination nor diameter is requested", () => {
      const illuminationEphemeris = {};
      const diameterEphemeris = {};
      vi.mocked(pheno_ut).mockClear();

      service.computePhenoForMinute({
        body: "sun",
        diameterEphemeris,
        illuminationEphemeris,
        julianDayUniversalTime: 2_460_395.499_306,
        needsDiameter: false,
        needsIllumination: false,
        swissEphemerisConstant: 0,
        timestamp: "2024-03-21T00:00:00.000Z",
      });

      expect(illuminationEphemeris).toStrictEqual({});
      expect(diameterEphemeris).toStrictEqual({});
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
