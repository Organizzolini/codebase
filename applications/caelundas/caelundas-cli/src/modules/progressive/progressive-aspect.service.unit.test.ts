import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProgressiveAspectService } from "./progressive-aspect.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

describe(ProgressiveAspectService, () => {
  let service: ProgressiveAspectService;
  let mockLoggerService: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProgressiveAspectService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(ProgressiveAspectService);
    mockLoggerService = module.get(LoggerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should build a stable group key", () => {
    expect(
      service.buildAspectGroupKeyFromCategories({
        aspects: ["conjunct"],
        bodies: ["sun", "moon"],
        categories: ["Moon", "Conjunct", "Sun"],
      }),
    ).toBe("Moon-Conjunct-Sun");
  });

  it("should build a simple progressive event", () => {
    const beginning = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Forming",
      ],
      description: "Sun forming conjunct Moon",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "Sun conjunct Moon",
    };
    const ending = {
      ...beginning,
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Dissolving",
      ],
      end: moment.utc("2024-03-21T13:00:00.000Z"),
    };

    const event = service.createSimpleAspectProgressiveEvent({
      aspectCategory: "Major Aspect",
      aspects: ["conjunct"],
      beginning,
      bodies: ["sun", "moon"],
      ending,
      isAspect: (value): value is "conjunct" => value === "conjunct",
      isBody: (value): value is "moon" | "sun" =>
        value === "sun" || value === "moon",
      symbolByAspect: { conjunct: "☌" },
      symbolByBody: { moon: "☾", sun: "☉" },
    });

    expect(event.categories).toContain("Major Aspect");
    expect(event.summary).toContain("☉");
    expect(event.summary).toContain("☾");
    expect(event.summary).toContain("☌");
  });

  it("should build progressive events from paired boundaries", () => {
    const forming = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Forming",
      ],
      description: "Sun forming conjunct Moon",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "Sun conjunct Moon",
    };
    const dissolving = {
      ...forming,
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Dissolving",
      ],
      end: moment.utc("2024-03-21T13:00:00.000Z"),
    };

    const events = service.buildProgressiveAspectEvents({
      aspectCategory: "Major Aspect",
      categoryLabel: "major aspect",
      events: [forming, dissolving],
      getAspectGroupKey: (event) =>
        service.buildAspectGroupKeyFromCategories({
          aspects: ["conjunct"],
          bodies: ["sun", "moon"],
          categories: event.categories,
        }),
      getProgressiveEvent: (beginning, ending) =>
        service.createSimpleAspectProgressiveEvent({
          aspectCategory: "Major Aspect",
          aspects: ["conjunct"],
          beginning,
          bodies: ["sun", "moon"],
          ending,
          isAspect: (value): value is "conjunct" => value === "conjunct",
          isBody: (value): value is "moon" | "sun" =>
            value === "sun" || value === "moon",
          symbolByAspect: { conjunct: "☌" },
          symbolByBody: { moon: "☾", sun: "☉" },
        }),
      pairProgressiveEvents: (beginnings, endings) => {
        const pairs = _.zip(beginnings, endings).filter(
          (
            pair,
          ): pair is [(typeof beginnings)[number], (typeof endings)[number]] =>
            pair[0] !== undefined && pair[1] !== undefined,
        );
        return pairs;
      },
    });

    expect(events).toHaveLength(1);
  });

  describe("extractTypedAspectPartsOrThrow", () => {
    it("logs and throws with the original error preserved as cause", () => {
      const categories = ["Astronomy", "Astrology"];

      expect(() =>
        service.extractTypedAspectPartsOrThrow({
          aspects: ["conjunct"],
          bodies: ["sun", "moon"],
          categories,
          errorMessage: "Could not extract typed values",
          isAspect: (value): value is "conjunct" => value === "conjunct",
          isBody: (value): value is "moon" | "sun" =>
            value === "sun" || value === "moon",
        }),
      ).toThrow("Could not extract typed values");

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "📐 Failed extracting typed aspect parts",
        undefined,
        {
          categories,
          reason: expect.stringContaining(
            "Could not extract aspect info from categories",
          ) as string,
        },
      );

      let thrownError: unknown;
      try {
        service.extractTypedAspectPartsOrThrow({
          aspects: ["conjunct"],
          bodies: ["sun", "moon"],
          categories,
          errorMessage: "Could not extract typed values",
          isAspect: (value): value is "conjunct" => value === "conjunct",
          isBody: (value): value is "moon" | "sun" =>
            value === "sun" || value === "moon",
        });
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect((thrownError as Error).cause).toBeInstanceOf(Error);
    });

    it("stringifies a non-Error thrown value when logging the failure", () => {
      const categories = ["Astronomy", "Astrology"];
      const extractSpy = vi
        .spyOn(service, "extractTypedAspectParts")
        .mockImplementation(() => {
          throw "boom" as unknown as Error;
        });

      expect(() =>
        service.extractTypedAspectPartsOrThrow({
          aspects: ["conjunct"],
          bodies: ["sun", "moon"],
          categories,
          errorMessage: "Could not extract typed values",
          isAspect: (value): value is "conjunct" => value === "conjunct",
          isBody: (value): value is "moon" | "sun" =>
            value === "sun" || value === "moon",
        }),
      ).toThrow("Could not extract typed values");

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "📐 Failed extracting typed aspect parts",
        undefined,
        { categories, reason: "boom" },
      );

      extractSpy.mockRestore();
    });
  });
});
