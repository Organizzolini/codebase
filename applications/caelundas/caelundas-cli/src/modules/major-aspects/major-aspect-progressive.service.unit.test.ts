import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { MajorAspectProgressiveService } from "./major-aspect-progressive.service";

import type { Event } from "../calendar/calendar.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(MajorAspectProgressiveService, () => {
  let service: MajorAspectProgressiveService;
  let privateService: {
    castAspectPartsToTypes: (args: {
      aspectCapitalized: string;
      body1Capitalized: string;
      body2Capitalized: string;
      categories: string[];
    }) => { aspect: string; body1: string; body2: string };
    getAspectGroupKey: (event: Event) => string;
    getMajorAspectProgressiveEvent: (beginning: Event, ending: Event) => Event;
    processAspectGroup: (
      aspectGroupKey: string,
      aspectGroupEvents: Event[],
    ) => Event[];
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoggerService,
        ProgressiveAspectService,
        ProgressiveUtilitiesService,
        MajorAspectProgressiveService,
      ],
    }).compile();

    service = await module.resolve(MajorAspectProgressiveService);
    privateService = service as unknown as {
      castAspectPartsToTypes: (args: {
        aspectCapitalized: string;
        body1Capitalized: string;
        body2Capitalized: string;
        categories: string[];
      }) => { aspect: string; body1: string; body2: string };
      getAspectGroupKey: (event: Event) => string;
      getMajorAspectProgressiveEvent: (
        beginning: Event,
        ending: Event,
      ) => Event;
      processAspectGroup: (
        aspectGroupKey: string,
        aspectGroupEvents: Event[],
      ) => Event[];
    };
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detectProgressive", () => {
    const createMajorAspectEvent = (
      body1: string,
      body2: string,
      aspect: string,
      phase: string,
      timestamp: Moment,
    ): Event => ({
      categories: [
        "Astronomy",
        "Astrology",
        "Major Aspect",
        body1,
        body2,
        aspect,
        phase,
      ],
      description: `${body1} ${phase} ${aspect} ${body2}`,
      end: timestamp,
      start: timestamp,
      summary: `${body1} ${aspect} ${body2}`,
    });

    it("creates progressive events from forming and dissolving pairs", () => {
      const forming = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Conjunct",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const dissolving = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Conjunct",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );

      const progressiveEvents = service.detectProgressive([
        forming,
        dissolving,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]).toBeDefined();
      expect(progressiveEvents[0]?.start).toStrictEqual(forming.start);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolving.start);
      expect(progressiveEvents[0]?.categories).toContain("Simple Aspect");
      expect(progressiveEvents[0]?.categories).toContain("Major Aspect");
      expect(progressiveEvents[0]?.summary).toContain("☀️");
      expect(progressiveEvents[0]?.summary).toContain("☿");
      expect(progressiveEvents[0]?.summary).toContain("☌");
    });

    it("handles multiple aspect types for same body pair", () => {
      const formingConjunct = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Conjunct",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const dissolvingConjunct = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Conjunct",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );
      const formingOpposite = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Opposite",
        "Forming",
        moment.utc("2024-03-21T20:00:00.000Z"),
      );
      const dissolvingOpposite = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Opposite",
        "Dissolving",
        moment.utc("2024-03-22T00:00:00.000Z"),
      );

      const progressiveEvents = service.detectProgressive([
        formingConjunct,
        dissolvingConjunct,
        formingOpposite,
        dissolvingOpposite,
      ]);

      expect(progressiveEvents).toHaveLength(2);

      const conjunctDuration = progressiveEvents.find((event) =>
        event.description.includes("conjunct"),
      );
      const oppositeDuration = progressiveEvents.find((event) =>
        event.description.includes("opposite"),
      );

      expect(conjunctDuration).toBeDefined();
      expect(oppositeDuration).toBeDefined();
    });

    it("handles multiple body pairs", () => {
      const sunMercuryForming = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Conjunct",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const sunMercuryDissolving = createMajorAspectEvent(
        "Sun",
        "Mercury",
        "Conjunct",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );
      const venusJupiterForming = createMajorAspectEvent(
        "Venus",
        "Jupiter",
        "Trine",
        "Forming",
        moment.utc("2024-03-21T12:00:00.000Z"),
      );
      const venusJupiterDissolving = createMajorAspectEvent(
        "Venus",
        "Jupiter",
        "Trine",
        "Dissolving",
        moment.utc("2024-03-21T16:00:00.000Z"),
      );

      const progressiveEvents = service.detectProgressive([
        sunMercuryForming,
        sunMercuryDissolving,
        venusJupiterForming,
        venusJupiterDissolving,
      ]);

      expect(progressiveEvents).toHaveLength(2);
    });

    it("filters out non-major-aspect events", () => {
      const majorAspectForming = createMajorAspectEvent(
        "Sun",
        "Venus",
        "Conjunct",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const majorAspectDissolving = createMajorAspectEvent(
        "Sun",
        "Venus",
        "Conjunct",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );
      const nonAspectEvent: Event = {
        categories: ["Solar", "Daily Cycle"],
        description: "Sunrise",
        end: moment.utc("2024-03-21T12:00:00.000Z"),
        start: moment.utc("2024-03-21T12:00:00.000Z"),
        summary: "Sunrise",
      };

      const progressiveEvents = service.detectProgressive([
        majorAspectForming,
        majorAspectDissolving,
        nonAspectEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
    });

    it("handles empty events array", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("skips processing when aspect group key is empty", () => {
      const progressiveEvents = privateService.processAspectGroup("", []);

      expect(progressiveEvents).toStrictEqual([]);
    });

    it("returns empty key when group categories are incomplete", () => {
      expect(
        privateService.getAspectGroupKey({
          categories: ["Astronomy", "Astrology", "Major Aspect"],
          description: "invalid",
          end: moment.utc("2024-03-21T14:00:00.000Z"),
          start: moment.utc("2024-03-21T14:00:00.000Z"),
          summary: "invalid",
        }),
      ).toBe("");
    });

    it("throws when categories cannot extract aspect info", () => {
      const invalidEvent: Event = {
        categories: ["Astronomy", "Astrology", "Major Aspect", "Sun"],
        description: "invalid",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "invalid",
      };

      expect(() =>
        privateService.getMajorAspectProgressiveEvent(
          invalidEvent,
          invalidEvent,
        ),
      ).toThrow("Could not extract aspect info from categories");
    });

    it("throws when type casting receives invalid category values", () => {
      expect(() =>
        privateService.castAspectPartsToTypes({
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
      const eventWithAspect: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Major Aspect",
          "Conjunct",
          "Moon",
        ],
        description: "invalid",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "invalid",
      };

      expect(() =>
        privateService.getMajorAspectProgressiveEvent(
          eventWithAspect,
          eventWithAspect,
        ),
      ).toThrow("Could not extract typed values from categories");

      sortBySpy.mockRestore();
    });

    it("handles missing second sorted body entry before type casting", () => {
      const sortBySpy = vi
        .spyOn(_, "sortBy")
        .mockReturnValue(["Moon", undefined] as unknown);
      const eventWithAspect: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Major Aspect",
          "Conjunct",
          "Moon",
        ],
        description: "invalid",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "invalid",
      };

      expect(() =>
        privateService.getMajorAspectProgressiveEvent(
          eventWithAspect,
          eventWithAspect,
        ),
      ).toThrow("Could not extract typed values from categories");

      sortBySpy.mockRestore();
    });

    it("sorts body names alphabetically in progressive event", () => {
      const forming = createMajorAspectEvent(
        "Venus",
        "Sun",
        "Conjunct",
        "Forming",
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      const dissolving = createMajorAspectEvent(
        "Venus",
        "Sun",
        "Conjunct",
        "Dissolving",
        moment.utc("2024-03-21T14:00:00.000Z"),
      );

      const progressiveEvents = service.detectProgressive([
        forming,
        dissolving,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]).toBeDefined();
      expect(progressiveEvents[0]?.description).toContain("Sun");
      expect(progressiveEvents[0]?.description).toContain("Venus");
    });
  });
});
