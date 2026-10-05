import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import { PhaseCalculationService } from "./phase-calculation.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

const configureMathServiceMock = (
  mathService: DeepMocked<MathService>,
): void => {
  vi.mocked(mathService.getAngle).mockReturnValue(0);
  vi.mocked(mathService.isMaximum).mockReturnValue(false);
};

describe(PhaseCalculationService, () => {
  let service: PhaseCalculationService;
  let mathService: DeepMocked<MathService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PhaseCalculationService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
        { provide: MathService, useValue: createMock<MathService>() },
      ],
    }).compile();

    service = await module.resolve(PhaseCalculationService);
    mathService = module.get(MathService);

    configureMathServiceMock(mathService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("derives brightness values from current and margin samples", () => {
    const brightnesses = service.getBrightnesses({
      currentDistance: 2,
      currentIllumination: 8,
      nextDistances: [2, 4],
      nextIlluminations: [8, 8],
      previousDistances: [2, 1],
      previousIlluminations: [8, 2],
    });

    expect(brightnesses.currentBrightness).toBe(2);
    expect(brightnesses.nextBrightnesses).toStrictEqual([2, 0.5]);
    expect(brightnesses.previousBrightnesses).toStrictEqual([2, 2]);
  });

  it("throws when brightness distance and illumination lengths differ", () => {
    expect(() =>
      service.getBrightnesses({
        currentDistance: 2,
        currentIllumination: 8,
        nextDistances: [2, 4],
        nextIlluminations: [8],
        previousDistances: [2, 1],
        previousIlluminations: [8, 2],
      }),
    ).toThrow(
      "next distances and illuminations arrays must have the same length",
    );
  });

  it("throws when a brightness illumination sample is missing", () => {
    expect(() =>
      service.getBrightnesses({
        currentDistance: 2,
        currentIllumination: 8,
        nextDistances: [2, 4],
        nextIlluminations: [8, undefined] as unknown as number[],
        previousDistances: [2, 1],
        previousIlluminations: [8, 2],
      }),
    ).toThrow("Missing illumination at index 1");
  });

  it("detects rise and set threshold crossings", () => {
    mathService.getAngle.mockReturnValueOnce(5).mockReturnValueOnce(7);

    expect(
      service.isRise({
        currentLongitudePlanet: 10,
        currentLongitudeSun: 4,
        previousLongitudePlanet: 9,
        previousLongitudeSun: 4,
      }),
    ).toBe(true);

    mathService.getAngle.mockReturnValueOnce(7).mockReturnValueOnce(5);

    expect(
      service.isSet({
        currentLongitudePlanet: 10,
        currentLongitudeSun: 4,
        previousLongitudePlanet: 9,
        previousLongitudeSun: 4,
      }),
    ).toBe(true);
  });

  it("evaluates elongation maxima from previous/current/next angles", () => {
    mathService.getAngle
      .mockReturnValueOnce(11)
      .mockReturnValueOnce(13)
      .mockReturnValueOnce(9);
    mathService.isMaximum.mockReturnValueOnce(true);

    const isElongation = service.isElongation({
      currentLongitudePlanet: 10,
      currentLongitudeSun: 4,
      nextLongitudePlanet: 11,
      nextLongitudeSun: 4,
      previousLongitudePlanet: 9,
      previousLongitudeSun: 4,
    });

    expect(isElongation).toBe(true);
    expect(mathService.isMaximum).toHaveBeenCalledWith({
      current: 11,
      next: 13,
      previous: 9,
    });
  });

  it("combines directional and brightness checks", () => {
    const isEasternSpy = vi.spyOn(service, "isEastern").mockReturnValue(true);
    const isBrightestSpy = vi
      .spyOn(service, "isBrightest")
      .mockReturnValue(false);

    expect(
      service.isEasternBrightest({
        currentDistance: 2,
        currentIllumination: 8,
        currentLongitudePlanet: 10,
        currentLongitudeSun: 4,
        nextDistances: [2],
        nextIlluminations: [8],
        previousDistances: [2],
        previousIlluminations: [8],
      }),
    ).toBe(false);

    isEasternSpy.mockRestore();
    isBrightestSpy.mockRestore();
  });

  it("returns true for eastern and western elongation helper combinations", () => {
    const isElongationSpy = vi
      .spyOn(service, "isElongation")
      .mockReturnValue(true);
    const isEasternSpy = vi.spyOn(service, "isEastern").mockReturnValue(true);
    const isWesternSpy = vi.spyOn(service, "isWestern").mockReturnValue(true);

    expect(
      service.isEasternElongation({
        currentLongitudePlanet: 10,
        currentLongitudeSun: 4,
        nextLongitudePlanet: 11,
        nextLongitudeSun: 4,
        previousLongitudePlanet: 9,
        previousLongitudeSun: 4,
      }),
    ).toBe(true);
    expect(
      service.isWesternElongation({
        currentLongitudePlanet: 2,
        currentLongitudeSun: 4,
        nextLongitudePlanet: 3,
        nextLongitudeSun: 4,
        previousLongitudePlanet: 1,
        previousLongitudeSun: 4,
      }),
    ).toBe(true);

    isElongationSpy.mockRestore();
    isEasternSpy.mockRestore();
    isWesternSpy.mockRestore();
  });

  it("identifies brightest samples when current brightness exceeds surrounding values", () => {
    expect(
      service.isBrightest({
        currentDistance: 1,
        currentIllumination: 10,
        nextDistances: [1, 1],
        nextIlluminations: [8, 7],
        previousDistances: [1, 1],
        previousIlluminations: [8, 7],
      }),
    ).toBe(true);
  });

  it("formats timezone-aware ISO timestamps", () => {
    const value = service.formatTimeZoneIso(
      moment.utc("2024-03-21T12:00:00.000Z"),
      "America/New_York",
    );

    expect(value).toContain("2024-03-21T08:00:00.000");
  });

  it("filters events by category membership", () => {
    const result = service.filterByCategory(
      [
        {
          categories: ["Astronomy", "Target"],
          description: "match",
          end: moment.utc("2024-03-21T12:00:00.000Z"),
          start: moment.utc("2024-03-21T12:00:00.000Z"),
          summary: "match",
        },
        {
          categories: ["Astronomy", "Other"],
          description: "skip",
          end: moment.utc("2024-03-21T12:00:00.000Z"),
          start: moment.utc("2024-03-21T12:00:00.000Z"),
          summary: "skip",
        },
      ],
      "Target",
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe("match");
  });
});
