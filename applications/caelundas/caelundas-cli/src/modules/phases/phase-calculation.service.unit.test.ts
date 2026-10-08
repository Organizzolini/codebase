import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

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

  it("evaluates elongation maxima from previous/current/next angular separations", () => {
    mathService.getAngularSeparation
      .mockReturnValueOnce(11)
      .mockReturnValueOnce(13)
      .mockReturnValueOnce(9);
    mathService.isMaximum.mockReturnValueOnce(true);

    const isElongation = service.isElongation({
      currentLatitudePlanet: 2,
      currentLatitudeSun: 0,
      currentLongitudePlanet: 10,
      currentLongitudeSun: 4,
      nextLatitudePlanet: 3,
      nextLatitudeSun: 0,
      nextLongitudePlanet: 11,
      nextLongitudeSun: 4,
      previousLatitudePlanet: 1,
      previousLatitudeSun: 0,
      previousLongitudePlanet: 9,
      previousLongitudeSun: 4,
    });

    expect(isElongation).toBe(true);
    expect(mathService.getAngularSeparation).toHaveBeenNthCalledWith(
      1,
      [10, 2],
      [4, 0],
    );
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
        currentLatitudePlanet: 0,
        currentLatitudeSun: 0,
        currentLongitudePlanet: 10,
        currentLongitudeSun: 4,
        currentMagnitude: -4,
        currentPhaseAngle: 90,
        nextMagnitudes: [-3],
        previousMagnitudes: [-3],
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
        currentLatitudePlanet: 0,
        currentLatitudeSun: 0,
        currentLongitudePlanet: 10,
        currentLongitudeSun: 4,
        nextLatitudePlanet: 0,
        nextLatitudeSun: 0,
        nextLongitudePlanet: 11,
        nextLongitudeSun: 4,
        previousLatitudePlanet: 0,
        previousLatitudeSun: 0,
        previousLongitudePlanet: 9,
        previousLongitudeSun: 4,
      }),
    ).toBe(true);
    expect(
      service.isWesternElongation({
        currentLatitudePlanet: 0,
        currentLatitudeSun: 0,
        currentLongitudePlanet: 2,
        currentLongitudeSun: 4,
        nextLatitudePlanet: 0,
        nextLatitudeSun: 0,
        nextLongitudePlanet: 3,
        nextLongitudeSun: 4,
        previousLatitudePlanet: 0,
        previousLatitudeSun: 0,
        previousLongitudePlanet: 1,
        previousLongitudeSun: 4,
      }),
    ).toBe(true);

    isElongationSpy.mockRestore();
    isEasternSpy.mockRestore();
    isWesternSpy.mockRestore();
  });

  it("identifies brightest samples when the current magnitude is below the surrounding values", () => {
    mathService.getAngularSeparation.mockReturnValue(40);
    const position = {
      currentLatitudePlanet: 0,
      currentLatitudeSun: 0,
      currentLongitudePlanet: 140,
      currentLongitudeSun: 100,
      currentPhaseAngle: 117,
    };

    expect(
      service.isBrightest({
        ...position,
        currentMagnitude: -4.8,
        nextMagnitudes: [-4.7, -4.6],
        previousMagnitudes: [-4.6, -4.7],
      }),
    ).toBe(true);
    expect(
      service.isBrightest({
        ...position,
        currentMagnitude: -4.8,
        nextMagnitudes: [-4.7, -4.6],
        previousMagnitudes: [-4.9, -4.7],
      }),
    ).toBe(false);
  });

  it("refuses a magnitude minimum past the brilliancy phase angle or inside the rise and set threshold", () => {
    const minimum = {
      currentLatitudePlanet: 0,
      currentLatitudeSun: 0,
      currentLongitudePlanet: 140,
      currentLongitudeSun: 100,
      currentMagnitude: -4.8,
      nextMagnitudes: [-4.7],
      previousMagnitudes: [-4.7],
    };

    mathService.getAngularSeparation.mockReturnValue(40);

    expect(service.isBrightest({ ...minimum, currentPhaseAngle: 159.9 })).toBe(
      true,
    );
    expect(service.isBrightest({ ...minimum, currentPhaseAngle: 160 })).toBe(
      false,
    );

    mathService.getAngularSeparation.mockReturnValue(5.9);

    expect(service.isBrightest({ ...minimum, currentPhaseAngle: 90 })).toBe(
      false,
    );

    mathService.getAngularSeparation.mockReturnValue(6);

    expect(service.isBrightest({ ...minimum, currentPhaseAngle: 90 })).toBe(
      true,
    );
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
