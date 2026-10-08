import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { DatetimeService } from "./datetime.service";

describe(DatetimeService, () => {
  let service: DatetimeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DatetimeService],
    }).compile();
    service = await module.resolve(DatetimeService);
  });

  describe("generateMinutes", () => {
    it("yields the start moment when start equals end", () => {
      const start = moment.utc("2024-03-21T00:00:00.000Z");
      const result = [...service.generateMinutes(start, start.clone())];

      expect(result).toHaveLength(1);
      expect(result[0]?.toISOString()).toBe(start.toISOString());
    });

    it("yields one moment per minute between start and end", () => {
      const start = moment.utc("2024-03-21T00:00:00.000Z");
      const end = moment.utc("2024-03-21T00:03:00.000Z");
      const result = [...service.generateMinutes(start, end)];

      expect(result).toHaveLength(4);
      expect(result[0]?.toISOString()).toBe("2024-03-21T00:00:00.000Z");
      expect(result[1]?.toISOString()).toBe("2024-03-21T00:01:00.000Z");
      expect(result[2]?.toISOString()).toBe("2024-03-21T00:02:00.000Z");
      expect(result[3]?.toISOString()).toBe("2024-03-21T00:03:00.000Z");
    });

    it("yields moments in UTC", () => {
      const start = moment.utc("2024-06-15T12:00:00.000Z");
      const end = moment.utc("2024-06-15T12:01:00.000Z");
      const result = [...service.generateMinutes(start, end)];
      for (const m of result) {
        expect(m.isUTC()).toBe(true);
      }
    });

    it("yields nothing when end is before start", () => {
      const start = moment.utc("2024-03-21T00:05:00.000Z");
      const end = moment.utc("2024-03-21T00:00:00.000Z");
      const result = [...service.generateMinutes(start, end)];

      expect(result).toHaveLength(0);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateDates", () => {
    it("yields the start date when start equals end", () => {
      const timezone = "America/New_York";
      const start = moment.tz("2024-03-21", timezone);
      const result = [...service.generateDates(start, start.clone(), timezone)];

      expect(result).toHaveLength(1);
      expect(result[0]?.format("YYYY-MM-DD")).toBe("2024-03-21");
    });

    it("yields one moment per day between start and end", () => {
      const timezone = "America/New_York";
      const start = moment.tz("2024-03-21", timezone);
      const end = moment.tz("2024-03-23", timezone);
      const result = [...service.generateDates(start, end, timezone)];

      expect(result).toHaveLength(3);
      expect(result[0]?.format("YYYY-MM-DD")).toBe("2024-03-21");
      expect(result[1]?.format("YYYY-MM-DD")).toBe("2024-03-22");
      expect(result[2]?.format("YYYY-MM-DD")).toBe("2024-03-23");
    });

    it("yields moments at the start of each calendar day in the given timezone", () => {
      const timezone = "America/Los_Angeles";
      const start = moment.tz("2024-03-21", timezone);
      const end = moment.tz("2024-03-22", timezone);
      const result = [...service.generateDates(start, end, timezone)];
      for (const m of result) {
        expect(m.hours()).toBe(0);
        expect(m.minutes()).toBe(0);
        expect(m.seconds()).toBe(0);
      }
    });

    it("yields nothing when end is before start", () => {
      const timezone = "America/New_York";
      const start = moment.tz("2024-03-23", timezone);
      const end = moment.tz("2024-03-21", timezone);
      const result = [...service.generateDates(start, end, timezone)];

      expect(result).toHaveLength(0);
    });

    it("handles UTC timezone", () => {
      const timezone = "UTC";
      const start = moment.utc("2024-01-01");
      const end = moment.utc("2024-01-03");
      const result = [...service.generateDates(start, end, timezone)];

      expect(result).toHaveLength(3);
      expect(result[0]?.format("YYYY-MM-DD")).toBe("2024-01-01");
      expect(result[2]?.format("YYYY-MM-DD")).toBe("2024-01-03");
    });
  });
});
