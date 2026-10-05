import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { MinorAspectsProgressiveService } from "./minor-aspects-progressive.service";

import type { Event } from "../calendar/calendar.types";

describe(MinorAspectsProgressiveService, () => {
  let service: MinorAspectsProgressiveService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MinorAspectsProgressiveService,
        ProgressiveAspectService,
        {
          provide: ProgressiveUtilitiesService,
          useValue: createMock<ProgressiveUtilitiesService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(MinorAspectsProgressiveService);
  });

  const progressiveUtilitiesService = {
    pairProgressiveEvents:
      vi.fn<ProgressiveUtilitiesService["pairProgressiveEvents"]>(),
  };
  const mockService = new MinorAspectsProgressiveService(
    new ProgressiveAspectService(createMock<LoggerService>()),
    progressiveUtilitiesService as never,
  );
  const privateService = mockService as unknown as {
    castAspectComponentsToTypes: (args: {
      aspectCapitalized: string;
      body1Capitalized: string;
      body2Capitalized: string;
      categories: string[];
    }) => { aspect: string; body1: string; body2: string };
    getMinorAspectProgressiveEvent: (beginning: Event, ending: Event) => Event;
    processAspectGroup: (
      aspectGroupKey: string,
      aspectGroupEvents: Event[],
    ) => Event[];
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("builds progressive events from forming and dissolving minor aspects", () => {
    const formingEvent: Event = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Minor Aspect",
        "Sun",
        "Moon",
        "Semisquare",
        "Forming",
      ],
      description: "Sun semisquare Moon",
      end: moment.utc("2024-03-21T10:00:00.000Z"),
      start: moment.utc("2024-03-21T10:00:00.000Z"),
      summary: "Sun semisquare Moon",
    };
    const dissolvingEvent: Event = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Minor Aspect",
        "Sun",
        "Moon",
        "Semisquare",
        "Dissolving",
      ],
      description: "Sun semisquare Moon",
      end: moment.utc("2024-03-21T14:00:00.000Z"),
      start: moment.utc("2024-03-21T14:00:00.000Z"),
      summary: "Sun semisquare Moon",
    };

    progressiveUtilitiesService.pairProgressiveEvents.mockReturnValueOnce([
      [formingEvent, dissolvingEvent],
    ]);

    const progressiveEvents = mockService.detectProgressive([
      formingEvent,
      dissolvingEvent,
    ]);

    expect(progressiveEvents).toHaveLength(1);
    expect(progressiveEvents[0]?.description).toBe("Moon semisquare Sun");
  });

  it("returns empty when aspect group key is empty", () => {
    expect(privateService.processAspectGroup("", [])).toStrictEqual([]);
  });

  it("returns empty key for invalid categories", () => {
    expect(
      mockService.buildGroupKey({
        categories: ["Astronomy", "Astrology", "Minor Aspect"],
        description: "invalid",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "invalid",
      }),
    ).toBe("");
  });

  it("throws when categories do not contain a complete minor aspect", () => {
    const invalidEvent: Event = {
      categories: ["Astronomy", "Minor Aspect", "Sun"],
      description: "invalid",
      end: moment.utc("2024-03-21T10:00:00.000Z"),
      start: moment.utc("2024-03-21T10:00:00.000Z"),
      summary: "invalid",
    };

    expect(() =>
      privateService.getMinorAspectProgressiveEvent(invalidEvent, invalidEvent),
    ).toThrow("Could not extract aspect info from categories");
  });

  it("throws when type casting receives invalid minor-aspect values", () => {
    expect(() =>
      privateService.castAspectComponentsToTypes({
        aspectCapitalized: "Invalid Aspect",
        body1Capitalized: "Invalid Body",
        body2Capitalized: "Moon",
        categories: ["Invalid Aspect", "Invalid Body", "Moon"],
      }),
    ).toThrow("Could not extract typed values from categories");
  });

  it("handles undefined sorted body entries before type casting", () => {
    const sortBySpy = vi
      .spyOn(_, "sortBy")
      .mockReturnValue([undefined, "Moon"] as unknown);
    const invalidEvent: Event = {
      categories: [
        "Astronomy",
        "Astrology",
        "Minor Aspect",
        "Semisquare",
        "Moon",
      ],
      description: "invalid",
      end: moment.utc("2024-03-21T10:00:00.000Z"),
      start: moment.utc("2024-03-21T10:00:00.000Z"),
      summary: "invalid",
    };

    expect(() =>
      privateService.getMinorAspectProgressiveEvent(invalidEvent, invalidEvent),
    ).toThrow("Could not extract typed values from categories");

    sortBySpy.mockRestore();
  });

  it("handles undefined second sorted body entry before type casting", () => {
    const sortBySpy = vi
      .spyOn(_, "sortBy")
      .mockReturnValue(["Moon", undefined] as unknown);
    const invalidEvent: Event = {
      categories: [
        "Astronomy",
        "Astrology",
        "Minor Aspect",
        "Semisquare",
        "Moon",
      ],
      description: "invalid",
      end: moment.utc("2024-03-21T10:00:00.000Z"),
      start: moment.utc("2024-03-21T10:00:00.000Z"),
      summary: "invalid",
    };

    expect(() =>
      privateService.getMinorAspectProgressiveEvent(invalidEvent, invalidEvent),
    ).toThrow("Could not extract typed values from categories");

    sortBySpy.mockRestore();
  });
});
