import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectEphemerisService } from "../aspects/aspect-ephemeris.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { MinorAspectsComposerService } from "./minor-aspects-composer.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

describe(MinorAspectsComposerService, () => {
  let service: MinorAspectsComposerService;
  let aspectEphemerisService: DeepMocked<AspectEphemerisService>;
  let progressiveUtilitiesService: DeepMocked<ProgressiveUtilitiesService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MinorAspectsComposerService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: AspectEphemerisService,
          useValue: createMock<AspectEphemerisService>(),
        },
        {
          provide: ProgressiveUtilitiesService,
          useValue: createMock<ProgressiveUtilitiesService>(),
        },
      ],
    }).compile();

    service = await module.resolve(MinorAspectsComposerService);
    aspectEphemerisService = module.get(AspectEphemerisService);
    progressiveUtilitiesService = module.get(ProgressiveUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("assembles boundary events for every phase", () => {
    const timestamp = moment.utc("2024-03-21T12:00:00.000Z");

    expect(
      service.assembleMinorAspectEvent({
        body1: "sun",
        body2: "moon",
        minorAspect: "semisextile",
        phase: "perfective",
        timestamp,
      }),
    ).toStrictEqual(
      expect.objectContaining({
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Minor Aspect",
          "Sun",
          "Moon",
          "Semisextile",
          "Perfective",
        ],
        description: "Sun perfective semisextile Moon",
        summary: "🎯 ☀️ ⚺ 🌙 Sun perfective semisextile Moon",
      }),
    );

    expect(
      service.assembleMinorAspectEvent({
        body1: "sun",
        body2: "moon",
        minorAspect: "semisextile",
        phase: "forming",
        timestamp,
      }),
    ).toStrictEqual(
      expect.objectContaining({
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Minor Aspect",
          "Sun",
          "Moon",
          "Semisextile",
          "Forming",
        ],
        description: "Sun forming semisextile Moon",
        summary: "➡️ ☀️ ⚺ 🌙 Sun forming semisextile Moon",
      }),
    );

    expect(
      service.assembleMinorAspectEvent({
        body1: "sun",
        body2: "moon",
        minorAspect: "semisextile",
        phase: "dissolving",
        timestamp,
      }),
    ).toStrictEqual(
      expect.objectContaining({
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Minor Aspect",
          "Sun",
          "Moon",
          "Semisextile",
          "Dissolving",
        ],
        description: "Sun dissolving semisextile Moon",
        summary: "⬅️ ☀️ ⚺ 🌙 Sun dissolving semisextile Moon",
      }),
    );
  });

  it("extracts and casts aspect components", () => {
    expect(
      service.extractAspectComponents([
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Minor Aspect",
        "Moon",
        "Sun",
        "Semisextile",
      ]),
    ).toStrictEqual({
      aspect: "semisextile",
      aspectCapitalized: "Semisextile",
      body1: "moon",
      body1Capitalized: "Moon",
      body2: "sun",
      body2Capitalized: "Sun",
    });

    expect(
      service.castAspectComponentsToTypes({
        aspectCapitalized: "Semisextile",
        body1Capitalized: "Moon",
        body2Capitalized: "Sun",
        categories: ["Semisextile", "Moon", "Sun"],
      }),
    ).toStrictEqual({
      aspect: "semisextile",
      body1: "moon",
      body2: "sun",
    });

    expect(() =>
      service.extractAspectComponents(["Astronomy", "Minor Aspect", "Moon"]),
    ).toThrow("Could not extract aspect info");
  });

  it("builds progressive events and grouping keys", () => {
    const minute = moment.utc("2024-03-21T12:00:00.000Z");
    const beginning = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Minor Aspect",
        "Moon",
        "Sun",
        "Semisextile",
        "Forming",
      ],
      description: "Sun forming semisextile Moon",
      end: minute,
      start: minute,
      summary: "➡️ ☀️ ⚺ 🌙 Sun forming semisextile Moon",
    };
    const ending = {
      ...beginning,
      categories: beginning.categories.map((category) =>
        category === "Forming" ? "Dissolving" : category,
      ),
      description: "Sun dissolving semisextile Moon",
      end: minute.clone().add(1, "hour"),
      start: minute.clone().add(1, "hour"),
      summary: "⬅️ ☀️ ⚺ 🌙 Sun dissolving semisextile Moon",
    };

    progressiveUtilitiesService.pairProgressiveEvents.mockReturnValue([
      [beginning, ending],
    ]);

    expect(service.buildGroupKey(beginning)).toBe("Moon-Semisextile-Sun");
    expect(service.buildGroupKey({ ...beginning, categories: ["Moon"] })).toBe(
      "",
    );

    expect(
      service.getMinorAspectProgressiveEvent(beginning, ending),
    ).toStrictEqual(
      expect.objectContaining({
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Minor Aspect",
          "Moon",
          "Sun",
          "Semisextile",
        ],
        description: "Moon semisextile Sun",
      }),
    );

    expect(
      service.processAspectGroup("Moon-Semisextile-Sun", [beginning, ending]),
    ).toHaveLength(1);
    expect(service.processAspectGroup("", [beginning, ending])).toStrictEqual(
      [],
    );

    const pairProgressiveEventsCall =
      progressiveUtilitiesService.pairProgressiveEvents.mock.calls[0];

    expect(pairProgressiveEventsCall).toStrictEqual([
      [beginning],
      [ending],
      "minor aspect Moon-Semisextile-Sun",
    ]);
  });

  it("reads longitudes from ephemerides and rejects invalid input", () => {
    aspectEphemerisService.getLongitudesWindowForBody.mockReturnValue({
      current: 10,
      next: 11,
      previous: 9,
    });

    expect(
      service.getLongitudesWindowForBody({
        body: "sun",
        coordinateEphemerisByBody: { sun: {} } as never,
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        nextMinute: moment.utc("2024-03-21T12:01:00.000Z"),
        previousMinute: moment.utc("2024-03-21T11:59:00.000Z"),
      }),
    ).toStrictEqual({ current: 10, next: 11, previous: 9 });

    expect(() =>
      service.castAspectComponentsToTypes({
        aspectCapitalized: "Not An Aspect",
        body1Capitalized: "Moon",
        body2Capitalized: "Sun",
        categories: ["Moon", "Sun"],
      }),
    ).toThrow("Could not extract typed values");
  });

  it("falls back to empty first body when sorted category output is sparse", () => {
    const toSortedSpy = vi
      .spyOn(Array.prototype, "toSorted")
      .mockReturnValueOnce([undefined, "Sun"]);

    expect(() =>
      service.extractAspectComponents([
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Minor Aspect",
        "Moon",
        "Sun",
        "Semisextile",
      ]),
    ).toThrow("Could not extract typed values");

    toSortedSpy.mockRestore();
  });

  it("falls back to empty second body when sorted category output is sparse", () => {
    const toSortedSpy = vi
      .spyOn(Array.prototype, "toSorted")
      .mockReturnValueOnce(["Moon", undefined]);

    expect(() =>
      service.extractAspectComponents([
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Minor Aspect",
        "Moon",
        "Sun",
        "Semisextile",
      ]),
    ).toThrow("Could not extract typed values");

    toSortedSpy.mockRestore();
  });
});
