import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { utc_to_jd } from "sweph";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EphemerisTimeService } from "./ephemeris-time.service";

import type * as Sweph from "sweph";

vi.mock("sweph", async (importOriginal) => {
  const original = await importOriginal<typeof Sweph>();
  return {
    ...original,
    utc_to_jd: vi.fn<typeof utc_to_jd>().mockReturnValue({
      data: [2_460_395.5, 2_460_395.499_306],
      error: "",
      flag: 0,
    }),
  };
});

describe(EphemerisTimeService, () => {
  let service: EphemerisTimeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [EphemerisTimeService],
    }).compile();

    service = await module.resolve(EphemerisTimeService);
  });

  describe("dateToJulianDays", () => {
    it("returns julian day values from sweph", () => {
      const result = service.dateToJulianDays(
        moment.utc("2024-03-21T00:00:00.000Z"),
      );

      expect(result.julianDayEphemerisTime).toBe(2_460_395.5);
      expect(result.julianDayUniversalTime).toBe(2_460_395.499_306);
    });

    it("throws when utc_to_jd returns a negative flag", () => {
      vi.mocked(utc_to_jd).mockReturnValueOnce({
        data: [0, 0],
        error: "conversion failed",
        flag: -1,
      });

      expect(() =>
        service.dateToJulianDays(moment.utc("2024-03-21T00:00:00.000Z")),
      ).toThrow("utc_to_jd failed");
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateMinutes", () => {
    it("yields start and end inclusively", () => {
      const start = moment.utc("2024-03-21T00:00:00.000Z");
      const end = moment.utc("2024-03-21T00:02:00.000Z");

      const minutes = [...service.generateMinutes(start, end)];

      expect(minutes).toHaveLength(3);
      expect(minutes[0]?.toISOString()).toBe("2024-03-21T00:00:00.000Z");
      expect(minutes[2]?.toISOString()).toBe("2024-03-21T00:02:00.000Z");
    });
  });
});
