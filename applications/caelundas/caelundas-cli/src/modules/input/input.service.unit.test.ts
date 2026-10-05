import { createMock } from "@golevelup/ts-vitest";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { mockDates } from "../../../testing/mocks";
import { environmentSchema } from "../../constants";

import { inputSchema } from "./input.constants";
import { InputService } from "./input.service";

import type { Environment } from "./input.types";
import type { DeepMocked } from "@golevelup/ts-vitest";

describe(InputService, () => {
  let service: InputService;
  let mockLoggerService: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InputService,
        {
          provide: ConfigService,
          useValue: { get: vi.fn<ConfigService["get"]>() },
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    service = await module.resolve(InputService);
    mockLoggerService = module.get(LoggerService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("environmentSchema.parse", () => {
    it("returns validated environment with all fields provided", () => {
      const environment = environmentSchema.parse({
        END_DATE: "2025-01-02",
        LATITUDE: "40.7128",
        LONGITUDE: "-74.006",
        OUTPUT_DIRECTORY: "./out",
        START_DATE: "2025-01-01",
      });

      expect(environment.LATITUDE).toBe(40.7128);
      expect(environment.LONGITUDE).toBe(-74.006);
      expect(environment.START_DATE).toBe("2025-01-01");
      expect(environment.END_DATE).toBe("2025-01-02");
      expect(environment.OUTPUT_DIRECTORY).toBe("./out");
    });

    it("defaults OUTPUT_DIRECTORY to ./output when omitted", () => {
      const environment = environmentSchema.parse({});

      expect(environment.OUTPUT_DIRECTORY).toBe("./output");
    });

    it("coerces string coordinates to numbers", () => {
      const environment = environmentSchema.parse({
        LATITUDE: "40.7128",
        LONGITUDE: "-74.006",
      });

      expect(typeof environment.LATITUDE).toBe("number");
      expect(typeof environment.LONGITUDE).toBe("number");
    });

    it("succeeds when all fields are omitted", () => {
      expect(() => environmentSchema.parse({})).not.toThrow();
    });

    it("throws when LATITUDE is out of range", () => {
      expect(() => environmentSchema.parse({ LATITUDE: "91" })).toThrow(
        /latitude/i,
      );
    });

    it("throws when LONGITUDE is out of range", () => {
      expect(() => environmentSchema.parse({ LONGITUDE: "181" })).toThrow(
        /longitude/i,
      );
    });

    it("throws when START_DATE format is invalid", () => {
      expect(() =>
        environmentSchema.parse({ START_DATE: "01-01-2025" }),
      ).toThrow(/date/i);
    });

    it("throws when END_DATE format is invalid", () => {
      expect(() => environmentSchema.parse({ END_DATE: "not-a-date" })).toThrow(
        /date/i,
      );
    });
  });

  describe("parse", () => {
    mockDates();

    function makeService(environment: Partial<Environment>): InputService {
      const configService = {
        get: vi.fn<ConfigService<Environment>["get"]>(
          (key: string) => environment[key as keyof Environment],
        ),
      } as unknown as ConfigService<Environment>;
      return new InputService(configService, createMock<LoggerService>());
    }

    it("parses valid environment into an Input domain object", () => {
      const service = makeService({
        END_DATE: "2025-01-02",
        LATITUDE: 40.7128,
        LONGITUDE: -74.006,
        START_DATE: "2025-01-01",
      });
      const result = service.parse();

      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.006);
      expect(result.timezone).toBe("America/New_York");
      expect(moment.isMoment(result.start)).toBe(true);
      expect(moment.isMoment(result.end)).toBe(true);
    });

    it("logs the parsed input configuration on success", () => {
      const result = service.parse();

      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        "📥 Parsed input configuration",
        undefined,
        {
          endDate: result.end.toISOString(),
          latitude: result.latitude,
          longitude: result.longitude,
          startDate: result.start.toISOString(),
          timezone: result.timezone,
        },
      );
    });

    it("uses Philadelphia defaults when coordinates are omitted", () => {
      const service = makeService({
        END_DATE: "2025-01-02",
        START_DATE: "2025-01-01",
      });
      const result = service.parse();

      expect(result.latitude).toBe(39.949_309);
      expect(result.longitude).toBe(-75.171_69);
    });

    it("uses default date range when dates are omitted", () => {
      const service = makeService({});
      const result = service.parse();

      expect(result.start.valueOf()).toBeLessThan(result.end.valueOf());
    });

    it("throws when end date is before start date", () => {
      const service = makeService({
        END_DATE: "2025-03-20",
        LATITUDE: 40,
        LONGITUDE: -74,
        START_DATE: "2025-03-21",
      });

      expect(() => service.parse()).toThrow(/start|end date/i);
    });
  });

  describe("inputSchema", () => {
    // Mock moment to return a fixed date for default value testing
    mockDates();

    describe("latitude validation", () => {
      it("accepts valid latitudes", () => {
        const result = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "40.7128",
          longitude: "-74.006",
          startDate: "2025-01-01",
        });

        expect(result.latitude).toBe(40.7128);
      });

      it("accepts boundary latitudes", () => {
        expect(
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "-90",
            longitude: "0",
            startDate: "2025-01-01",
          }).latitude,
        ).toBe(-90);

        expect(
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "90",
            longitude: "0",
            startDate: "2025-01-01",
          }).latitude,
        ).toBe(90);
      });

      it("rejects latitudes outside valid range", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "91",
            longitude: "0",
            startDate: "2025-01-01",
          }),
        ).toThrow(/latitude/i);

        expect(() =>
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "-91",
            longitude: "0",
            startDate: "2025-01-01",
          }),
        ).toThrow(/latitude/i);
      });

      it("uses default latitude when not provided", () => {
        const result = inputSchema.parse({
          endDate: "2025-01-02",
          startDate: "2025-01-01",
        });

        expect(result.latitude).toBe(39.949_309); // Philadelphia
      });
    });

    describe("longitude validation", () => {
      it("accepts valid longitudes", () => {
        const result = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "40.7128",
          longitude: "-74.006",
          startDate: "2025-01-01",
        });

        expect(result.longitude).toBe(-74.006);
      });

      it("accepts boundary longitudes", () => {
        expect(
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "0",
            longitude: "-180",
            startDate: "2025-01-01",
          }).longitude,
        ).toBe(-180);

        expect(
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "0",
            longitude: "180",
            startDate: "2025-01-01",
          }).longitude,
        ).toBe(180);
      });

      it("rejects longitudes outside valid range", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "0",
            longitude: "181",
            startDate: "2025-01-01",
          }),
        ).toThrow(/longitude/i);

        expect(() =>
          inputSchema.parse({
            endDate: "2025-01-02",
            latitude: "0",
            longitude: "-181",
            startDate: "2025-01-01",
          }),
        ).toThrow(/longitude/i);
      });

      it("uses default longitude when not provided", () => {
        const result = inputSchema.parse({
          endDate: "2025-01-02",
          startDate: "2025-01-01",
        });

        expect(result.longitude).toBe(-75.171_69); // Philadelphia
      });
    });

    describe("timezone inference", () => {
      it("infers timezone from coordinates", () => {
        expect.hasAssertions(); // New York coordinates

        const nyResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "40.7128",
          longitude: "-74.006",
          startDate: "2025-01-01",
        });

        expect(nyResult.timezone).toBe("America/New_York");

        // Los Angeles coordinates
        const laResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "34.0522",
          longitude: "-118.2437",
          startDate: "2025-01-01",
        });

        expect(laResult.timezone).toBe("America/Los_Angeles");

        // London coordinates
        const londonResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "51.5074",
          longitude: "-0.1278",
          startDate: "2025-01-01",
        });

        expect(londonResult.timezone).toBe("Europe/London");
      });
    });

    describe("date validation", () => {
      it("parses valid date strings", () => {
        const result = inputSchema.parse({
          endDate: "2025-03-21",
          latitude: "40",
          longitude: "-74",
          startDate: "2025-03-20",
        });

        expect(moment.isMoment(result.start)).toBe(true);
        expect(moment.isMoment(result.end)).toBe(true);
      });

      it("requires end date after start date", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2025-03-20",
            latitude: "40",
            longitude: "-74",
            startDate: "2025-03-21",
          }),
        ).toThrow(/end date must be after start date/i);
      });

      it("rejects identical start and end dates", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2025-03-20",
            latitude: "40",
            longitude: "-74",
            startDate: "2025-03-20",
          }),
        ).toThrow(/end date must be after start date/i);
      });

      it("rejects dates before 1900", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "1900-01-02",
            latitude: "40",
            longitude: "-74",
            startDate: "1899-12-31",
          }),
        ).toThrow(/Start date must be on or after 1900-01-01/i);
      });

      it("rejects dates after 2100", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2101-01-01",
            latitude: "40",
            longitude: "-74",
            startDate: "2100-12-30",
          }),
        ).toThrow(/End date must be on or before 2100-12-31/i);
      });
    });

    describe("default date values", () => {
      it("defaults to 1 month before and after current date", () => {
        const result = inputSchema.parse({});

        // Verify start is before end
        expect(result.start.valueOf()).toBeLessThan(result.end.valueOf());

        // Verify approximately 2 months span
        const diffDays =
          (result.end.valueOf() - result.start.valueOf()) /
          (1000 * 60 * 60 * 24);

        expect(diffDays).toBeGreaterThan(50); // ~2 months
        expect(diffDays).toBeLessThan(70);
      });
    });

    describe("coercion", () => {
      it("coerces string latitude/longitude to numbers", () => {
        const result = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "40.7128",
          longitude: "-74.006",
          startDate: "2025-01-01",
        });

        expect(typeof result.latitude).toBe("number");
        expect(typeof result.longitude).toBe("number");
      });
    });

    describe("start date validation refinements", () => {
      it("rejects start date before minimum date", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "1900-01-02",
            latitude: "40",
            longitude: "-74",
            startDate: "1899-12-31",
          }),
        ).toThrow(/Start date must be on or after 1900-01-01/i);
      });

      it("accepts start date exactly at minimum date boundary", () => {
        const result = inputSchema.parse({
          endDate: "1900-01-02",
          latitude: "40",
          longitude: "-74",
          startDate: "1900-01-01",
        });

        expect(result.start.format("YYYY-MM-DD")).toBe("1900-01-01");
      });

      it("rejects start date after maximum date", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2100-12-31",
            latitude: "40",
            longitude: "-74",
            startDate: "2101-01-01",
          }),
        ).toThrow(/Start date must be on or before 2100-12-31/i);
      });

      it("rejects start date exactly at maximum date boundary when end date is not later", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2100-12-31",
            latitude: "40",
            longitude: "-74",
            startDate: "2100-12-31",
          }),
        ).toThrow(/End date must be after start date/i);
      });
    });

    describe("end date validation refinements", () => {
      it("rejects end date before minimum date", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "1899-12-31",
            latitude: "40",
            longitude: "-74",
            startDate: "1900-01-01",
          }),
        ).toThrow(/End date must be on or after 1900-01-01/i);
      });

      it("rejects end date exactly at minimum date boundary when it is not after start date", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "1900-01-01",
            latitude: "40",
            longitude: "-74",
            startDate: "1900-01-01",
          }),
        ).toThrow(/End date must be after start date/i);
      });

      it("rejects end date after maximum date", () => {
        expect(() =>
          inputSchema.parse({
            endDate: "2101-01-01",
            latitude: "40",
            longitude: "-74",
            startDate: "2100-12-30",
          }),
        ).toThrow(/End date must be on or before 2100-12-31/i);
      });

      it("accepts end date exactly at maximum date boundary", () => {
        const result = inputSchema.parse({
          endDate: "2100-12-31",
          latitude: "40",
          longitude: "-74",
          startDate: "2100-01-01",
        });

        expect(result.end.format("YYYY-MM-DD")).toBe("2100-12-31");
      });
    });

    describe("timezone handling for various regions", () => {
      it("handles southern hemisphere coordinates", () => {
        const sydneyResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "-33.8688",
          longitude: "151.2093",
          startDate: "2025-01-01",
        });

        expect(sydneyResult.timezone).toBe("Australia/Sydney");
      });

      it("handles equatorial coordinates", () => {
        const result = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "0",
          longitude: "0",
          startDate: "2025-01-01",
        });

        // Prime meridian, equator - should resolve to a valid timezone
        expect(result.timezone).toBeDefined();
        expect(typeof result.timezone).toBe("string");
      });

      it("handles opposite side of prime meridian", () => {
        const tokyoResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "35.6762",
          longitude: "139.6503",
          startDate: "2025-01-01",
        });

        expect(tokyoResult.timezone).toBe("Asia/Tokyo");
      });
    });
  });
});
