import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import { SpecialtyAspectsComposerService } from "./specialty-aspects-composer.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

describe(SpecialtyAspectsComposerService, () => {
  let service: SpecialtyAspectsComposerService;
  let logger: DeepMocked<LoggerService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SpecialtyAspectsComposerService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: EphemerisService,
          useValue: createMock<EphemerisService>({
            getLongitudesWindow: vi
              .fn<EphemerisService["getLongitudesWindow"]>()
              .mockReturnValue({
                current: 72,
                next: 73,
                previous: 71,
              }),
          }),
        },
      ],
    }).compile();

    service = await module.resolve(SpecialtyAspectsComposerService);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("assembles boundary events for every phase", () => {
    const timestamp = moment.utc("2024-03-21T12:00:00.000Z");

    expect(
      service.buildSpecialtyAspectEventFromParts({
        body1Symbol: "☀️",
        body2Symbol: "🌙",
        categories: ["Astronomy", "Astrology", "Specialty Aspect"],
        description: "Sun quintile Moon",
        phaseEmoji: "🎯",
        specialtyAspectSymbol: "⬠",
        timestamp,
      }),
    ).toStrictEqual(
      expect.objectContaining({
        description: "Sun quintile Moon",
        summary: "🎯 ☀️ ⬠ 🌙 Sun quintile Moon",
      }),
    );

    expect(logger.info).toHaveBeenCalledWith(
      "🗓️ Built a calendar event",
      undefined,
      {
        at: timestamp.toISOString(),
        summary: "🎯 ☀️ ⬠ 🌙 Sun quintile Moon",
      },
    );
  });

  it("extracts and casts aspect components", () => {
    expect(
      service.extractAspectBodiesFromCategories([
        "Astronomy",
        "Astrology",
        "Specialty Aspect",
        "Moon",
        "Sun",
        "Quintile",
      ]),
    ).toStrictEqual({
      aspectCapitalized: "Quintile",
      body1Capitalized: "Moon",
      body2Capitalized: "Sun",
    });

    expect(
      service.extractTypedAspectValues({
        aspectCapitalized: "Quintile",
        body1Capitalized: "Moon",
        body2Capitalized: "Sun",
        categories: ["Quintile", "Moon", "Sun"],
      }),
    ).toStrictEqual({
      aspect: "quintile",
      body1: "moon",
      body2: "sun",
    });
  });

  it("builds progressive events and group keys", () => {
    const minute = moment.utc("2024-03-21T12:00:00.000Z");
    const beginning = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Specialty Aspect",
        "Moon",
        "Sun",
        "Quintile",
        "Forming",
      ],
      description: "Sun forming quintile Moon",
      end: minute,
      start: minute,
      summary: "➡️ ☀️⬠🌙 Sun forming quintile Moon",
    };
    const ending = {
      ...beginning,
      categories: beginning.categories.map((category) =>
        category === "Forming" ? "Dissolving" : category,
      ),
      description: "Sun dissolving quintile Moon",
      end: minute.clone().add(1, "hour"),
      start: minute.clone().add(1, "hour"),
      summary: "⬅️ ☀️⬠🌙 Sun dissolving quintile Moon",
    };

    expect(
      service.phaseFields({
        baseCategories: ["Astronomy", "Astrology"],
        body1Capitalized: "Moon",
        body2Capitalized: "Sun",
        phase: "forming",
        specialtyAspect: "quintile",
      }),
    ).toStrictEqual(
      expect.objectContaining({
        description: "Moon forming quintile Sun",
        phaseEmoji: "➡️",
      }),
    );
    expect(
      service.phaseFields({
        baseCategories: ["Astronomy", "Astrology"],
        body1Capitalized: "Moon",
        body2Capitalized: "Sun",
        phase: "perfective",
        specialtyAspect: "quintile",
      }),
    ).toStrictEqual(
      expect.objectContaining({
        description: "Moon perfective quintile Sun",
        phaseEmoji: "🎯",
      }),
    );
    expect(
      service.phaseFields({
        baseCategories: ["Astronomy", "Astrology"],
        body1Capitalized: "Moon",
        body2Capitalized: "Sun",
        phase: "dissolving",
        specialtyAspect: "quintile",
      }),
    ).toStrictEqual(
      expect.objectContaining({
        description: "Moon dissolving quintile Sun",
        phaseEmoji: "⬅️",
      }),
    );

    expect(service.specialtyAspectGroupKey(beginning)).toBe(
      "Moon-Quintile-Sun",
    );
    expect(
      service.specialtyAspectGroupKey({
        ...beginning,
        categories: ["Moon"],
      }),
    ).toBe("");

    expect(
      service.getSpecialtyAspectProgressiveEvent(beginning, ending),
    ).toStrictEqual(
      expect.objectContaining({
        description: "Moon quintile Sun",
        summary: "🌙⬠☀️ Moon quintile Sun",
      }),
    );

    expect(
      service.getBodyLongitudesWindow({
        ephemeris: {},
        minute,
        nextMinute: minute.clone().add(1, "minute"),
        previousMinute: minute.clone().subtract(1, "minute"),
      }),
    ).toStrictEqual({ current: 72, next: 73, previous: 71 });
  });

  it("rejects invalid input and formats grouped events", () => {
    expect(() =>
      service.extractTypedAspectValues({
        aspectCapitalized: "Not An Aspect",
        body1Capitalized: "Moon",
        body2Capitalized: "Sun",
        categories: ["Moon", "Sun"],
      }),
    ).toThrow("Could not extract typed values");

    expect(() => service.extractAspectBodiesFromCategories(["Moon"])).toThrow(
      "Could not extract aspect info",
    );
    expect(() =>
      service.getSpecialtyAspectProgressiveEvent(
        {
          categories: ["Astronomy", "Astrology", "Specialty Aspect", "Moon"],
          description: "Invalid",
          end: moment.utc("2024-03-21T12:00:00.000Z"),
          start: moment.utc("2024-03-21T12:00:00.000Z"),
          summary: "Invalid",
        },
        {
          categories: ["Astronomy", "Astrology", "Specialty Aspect", "Moon"],
          description: "Invalid",
          end: moment.utc("2024-03-21T12:01:00.000Z"),
          start: moment.utc("2024-03-21T12:01:00.000Z"),
          summary: "Invalid",
        },
      ),
    ).toThrow("Could not extract aspect info");
  });

  it("falls back to empty string when sorted body categories contain sparse values", () => {
    const sortBySpy = vi
      .spyOn(_, "sortBy")
      .mockReturnValue([undefined, "Sun"] as unknown);

    expect(
      service.extractAspectBodiesFromCategories([
        "Astronomy",
        "Astrology",
        "Specialty Aspect",
        "Moon",
        "Sun",
        "Quintile",
      ]),
    ).toStrictEqual({
      aspectCapitalized: "Quintile",
      body1Capitalized: "",
      body2Capitalized: "Sun",
    });

    sortBySpy.mockRestore();
  });

  it("falls back to empty string for the second body when sort output is sparse", () => {
    const sortBySpy = vi
      .spyOn(_, "sortBy")
      .mockReturnValue(["Moon", undefined] as unknown);

    expect(
      service.extractAspectBodiesFromCategories([
        "Astronomy",
        "Astrology",
        "Specialty Aspect",
        "Moon",
        "Sun",
        "Quintile",
      ]),
    ).toStrictEqual({
      aspectCapitalized: "Quintile",
      body1Capitalized: "Moon",
      body2Capitalized: "",
    });

    sortBySpy.mockRestore();
  });
});
