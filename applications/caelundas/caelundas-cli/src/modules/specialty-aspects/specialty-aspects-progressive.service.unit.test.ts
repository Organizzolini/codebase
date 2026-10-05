import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { SpecialtyAspectsProgressiveService } from "./specialty-aspects-progressive.service";

import type { Event } from "../calendar/calendar.types";

describe(SpecialtyAspectsProgressiveService, () => {
  let service: SpecialtyAspectsProgressiveService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SpecialtyAspectsProgressiveService,
        ProgressiveAspectService,
        {
          provide: ProgressiveUtilitiesService,
          useValue: createMock<ProgressiveUtilitiesService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(SpecialtyAspectsProgressiveService);
  });

  const progressiveUtilitiesService = {
    pairProgressiveEvents:
      vi.fn<ProgressiveUtilitiesService["pairProgressiveEvents"]>(),
  };

  const mockService = new SpecialtyAspectsProgressiveService(
    new ProgressiveAspectService(createMock<LoggerService>()),
    progressiveUtilitiesService as never,
  );
  const specialtyAspectsProgressiveService = mockService as unknown as {
    extractTypedAspectValues: (args: {
      aspectCapitalized: string;
      body1Capitalized: string;
      body2Capitalized: string;
      categories: string[];
    }) => { aspect: string; body1: string; body2: string };
    getSpecialtyAspectProgressiveEvent: (
      beginning: Event,
      ending: Event,
    ) => Event;
    processAspectGroup: (
      aspectGroupKey: string,
      aspectGroupEvents: Event[],
    ) => Event[];
    specialtyAspectGroupKey: (event: Event) => string;
  };

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns an empty group key for incomplete categories", () => {
    expect(
      specialtyAspectsProgressiveService.specialtyAspectGroupKey({
        categories: ["Astronomy", "Astrology"],
        description: "Incomplete categories",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Incomplete categories",
      }),
    ).toBe("");
  });

  it("returns an empty array for an empty progressive group key", () => {
    expect(
      specialtyAspectsProgressiveService.processAspectGroup("", []),
    ).toStrictEqual([]);
  });

  it("throws when categories do not include a complete specialty aspect", () => {
    expect(() =>
      specialtyAspectsProgressiveService.getSpecialtyAspectProgressiveEvent(
        {
          categories: ["Astronomy", "Astrology", "Specialty Aspect", "Sun"],
          description: "Invalid beginning",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "Invalid beginning",
        },
        {
          categories: ["Astronomy", "Astrology", "Specialty Aspect", "Sun"],
          description: "Invalid ending",
          end: moment.utc("2024-03-21T11:00:00.000Z"),
          start: moment.utc("2024-03-21T11:00:00.000Z"),
          summary: "Invalid ending",
        },
      ),
    ).toThrow("Could not extract aspect info from categories");
  });

  it("throws when extracted specialty values cannot be cast to typed values", () => {
    expect(() =>
      specialtyAspectsProgressiveService.extractTypedAspectValues({
        aspectCapitalized: "Not Specialty",
        body1Capitalized: "Sun",
        body2Capitalized: "Moon",
        categories: ["Not Specialty", "Sun", "Moon"],
      }),
    ).toThrow("Could not extract typed values from categories");
  });

  it("falls back to empty body strings when sorted bodies include undefined", () => {
    const sortBySpy = vi
      .spyOn(_, "sortBy")
      .mockReturnValue([undefined, "Moon"] as unknown);

    expect(() =>
      specialtyAspectsProgressiveService.getSpecialtyAspectProgressiveEvent(
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Simple Aspect",
            "Specialty Aspect",
            "Sun",
            "Moon",
            "Quintile",
            "Forming",
          ],
          description: "invalid beginning",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "invalid beginning",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Simple Aspect",
            "Specialty Aspect",
            "Sun",
            "Moon",
            "Quintile",
            "Dissolving",
          ],
          description: "invalid ending",
          end: moment.utc("2024-03-21T11:00:00.000Z"),
          start: moment.utc("2024-03-21T11:00:00.000Z"),
          summary: "invalid ending",
        },
      ),
    ).toThrow("Could not extract typed values from categories");

    sortBySpy.mockRestore();
  });

  it("falls back when the second sorted body is undefined", () => {
    const sortBySpy = vi
      .spyOn(_, "sortBy")
      .mockReturnValue(["Moon", undefined] as unknown);

    expect(() =>
      specialtyAspectsProgressiveService.getSpecialtyAspectProgressiveEvent(
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Simple Aspect",
            "Specialty Aspect",
            "Sun",
            "Moon",
            "Quintile",
            "Forming",
          ],
          description: "invalid beginning",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "invalid beginning",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Simple Aspect",
            "Specialty Aspect",
            "Sun",
            "Moon",
            "Quintile",
            "Dissolving",
          ],
          description: "invalid ending",
          end: moment.utc("2024-03-21T11:00:00.000Z"),
          start: moment.utc("2024-03-21T11:00:00.000Z"),
          summary: "invalid ending",
        },
      ),
    ).toThrow("Could not extract typed values from categories");

    sortBySpy.mockRestore();
  });

  it("creates progressive events from grouped forming and dissolving events", () => {
    progressiveUtilitiesService.pairProgressiveEvents.mockReturnValueOnce([
      [
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Simple Aspect",
            "Specialty Aspect",
            "Sun",
            "Moon",
            "Quintile",
            "Forming",
          ],
          description: "Sun quintile Moon",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "⬠ Sun quintile Moon",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Simple Aspect",
            "Specialty Aspect",
            "Sun",
            "Moon",
            "Quintile",
            "Dissolving",
          ],
          description: "Sun quintile Moon",
          end: moment.utc("2024-03-21T11:00:00.000Z"),
          start: moment.utc("2024-03-21T11:00:00.000Z"),
          summary: "⬠ Sun quintile Moon",
        },
      ],
    ]);

    const progressiveEvents = mockService.detectProgressive([
      {
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Specialty Aspect",
          "Sun",
          "Moon",
          "Quintile",
          "Forming",
        ],
        description: "Sun quintile Moon",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "⬠ Sun quintile Moon",
      },
      {
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Specialty Aspect",
          "Sun",
          "Moon",
          "Quintile",
          "Dissolving",
        ],
        description: "Sun quintile Moon",
        end: moment.utc("2024-03-21T11:00:00.000Z"),
        start: moment.utc("2024-03-21T11:00:00.000Z"),
        summary: "⬠ Sun quintile Moon",
      },
    ]);

    expect(
      progressiveUtilitiesService.pairProgressiveEvents,
    ).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Object)]),
      expect.arrayContaining([expect.any(Object)]),
      expect.stringContaining("specialty aspect"),
    );
    expect(progressiveEvents).toHaveLength(1);
    expect(progressiveEvents[0]?.description).toBe("Moon quintile Sun");
    expect(progressiveEvents[0]?.summary).toContain("Moon quintile Sun");
  });
});
