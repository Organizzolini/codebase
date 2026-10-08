import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { calc, type nod_aps_ut } from "sweph";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("sweph", async (importOriginal) => {
  const importedModule = await importOriginal();
  const actual =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};
  return {
    ...actual,
    calc: vi.fn<typeof calc>().mockReturnValue({
      data: [120.5, -1.2, 1.01, 0, 0, 0],
      error: "",
      flag: 258,
    }),
    nod_aps_ut: vi.fn<typeof nod_aps_ut>().mockReturnValue({
      data: {
        perihelion: [90, 0, 0, 0, 0, 0],
      } as never,
      error: "",
      flag: 258,
    }),
  };
});

vi.mock("./ephemeris.constants", async (importOriginal) => {
  const importedModule = await importOriginal();
  const actual =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};
  return {
    ...actual,
    swissEphemerisConstantByNode: {
      "lunar apogee": 22,
      "lunar perigee": null,
      "north lunar node": null,
      "south lunar node": 11,
    },
  };
});

import { MathService } from "../math/math.service";

import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisTimeService } from "./ephemeris-time.service";

describe(EphemerisCoordinateService, () => {
  const constantsService = {
    getSwissEphemerisConstantForBody: vi
      .fn<EphemerisConstantsService["getSwissEphemerisConstantForBody"]>()
      .mockReturnValue(0),
  };
  const timeService = {
    dateToJulianDays: vi
      .fn<EphemerisTimeService["dateToJulianDays"]>()
      .mockReturnValue({
        julianDayEphemerisTime: 2_460_395.5,
        julianDayUniversalTime: 2_460_395.499_306,
      }),
    generateMinutes: vi.fn<
      (start: moment.Moment, end: moment.Moment) => Iterable<moment.Moment>
    >((start: moment.Moment, end: moment.Moment) => {
      const values: moment.Moment[] = [];
      let current = start.clone();
      while (current.valueOf() <= end.valueOf()) {
        values.push(current.clone());
        current = current.clone().add(1, "minute");
      }
      return values;
    }),
  };
  const mathService = createMock<MathService>();
  vi.mocked(mathService.normalizeDegrees).mockImplementation(
    (degree: number) => degree,
  );

  let service: EphemerisCoordinateService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EphemerisCoordinateService,
        { provide: EphemerisConstantsService, useValue: constantsService },
        { provide: MathService, useValue: mathService },
        { provide: EphemerisTimeService, useValue: timeService },
      ],
    }).compile();

    service = await module.resolve(EphemerisCoordinateService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("throws when a node has no Swiss Ephemeris constant", () => {
    expect(() =>
      service.computeNodeBodyMinutes({
        body: "north lunar node",
        end: moment.utc("2024-03-21T00:00:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      }),
    ).toThrow(
      "No Swiss Ephemeris constant configured for node: north lunar node",
    );
  });

  it("throws when a regular node calculation fails", () => {
    vi.mocked(calc).mockReturnValueOnce({
      data: [0, 0, 0, 0, 0, 0],
      error: "calc failed",
      flag: -1,
    } as never);

    expect(() =>
      service.computeNodeBodyMinutes({
        body: "south lunar node",
        end: moment.utc("2024-03-21T00:00:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      }),
    ).toThrow("calc failed for south lunar node: calc failed");
  });
});
