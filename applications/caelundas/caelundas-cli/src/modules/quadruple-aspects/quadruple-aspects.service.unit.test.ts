import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { QuadrupleAspectsBaseService } from "./quadruple-aspects-base.service";
import { QuadrupleAspectsComposerService } from "./quadruple-aspects-composer.service";
import { QuadrupleAspectsService } from "./quadruple-aspects.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";

describe(QuadrupleAspectsService, () => {
  let service: QuadrupleAspectsService;
  let baseService: QuadrupleAspectsBaseService;
  let composerService: QuadrupleAspectsComposerService;
  let compoundPhaseService: CompoundPhaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CompoundPhaseService,
        AspectGraphService,
        AspectPhaseEmojiService,
        QuadrupleAspectsBaseService,
        QuadrupleAspectsComposerService,
        QuadrupleAspectsService,
      ],
    }).compile();
    baseService = await module.resolve(QuadrupleAspectsBaseService);
    compoundPhaseService = await module.resolve(CompoundPhaseService);
    composerService = await module.resolve(QuadrupleAspectsComposerService);
    service = await module.resolve(QuadrupleAspectsService);
  });

  describe("detect", () => {
    describe("grand Cross composition", () => {
      it("detects Grand Cross from 2 oppositions and 4 squares", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        // Grand Cross: Sun opposite Moon, Mars opposite Jupiter
        // Plus squares: Sun-Mars, Sun-Jupiter, Moon-Mars, Moon-Jupiter
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "opposite", bodies: ["sun", "moon"] },
          { aspect: "opposite", bodies: ["mars", "jupiter"] },
          { aspect: "square", bodies: ["sun", "mars"] },
          { aspect: "square", bodies: ["sun", "jupiter"] },
          { aspect: "square", bodies: ["moon", "mars"] },
          { aspect: "square", bodies: ["moon", "jupiter"] },
        ];
        const previousAspectBodies: AspectBodies[] = [];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const grandCross = events.find((e) =>
          e.categories.includes("Grand Cross"),
        );

        expect(grandCross).toBeDefined();
        expect(grandCross?.description).toContain("grand cross");
        expect(grandCross?.categories).toContain("Sun");
        expect(grandCross?.categories).toContain("Moon");
        expect(grandCross?.categories).toContain("Mars");
        expect(grandCross?.categories).toContain("Jupiter");
      });

      it("detects forming Grand Cross", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        // Grand Cross forming (starts at current minute)
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "opposite", bodies: ["sun", "moon"] },
          { aspect: "opposite", bodies: ["mars", "jupiter"] },
          { aspect: "square", bodies: ["sun", "mars"] },
          { aspect: "square", bodies: ["sun", "jupiter"] },
          { aspect: "square", bodies: ["moon", "mars"] },
          { aspect: "square", bodies: ["moon", "jupiter"] },
        ];
        const previousAspectBodies: AspectBodies[] = [];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const grandCross = events.find((e) =>
          e.categories.includes("Grand Cross"),
        );

        expect(grandCross).toBeDefined();
        expect(grandCross?.categories).toContain("Forming");
      });

      it("detects dissolving Grand Cross", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        // Grand Cross dissolving (ends at current minute)
        const currentAspectBodies: AspectBodies[] = [];
        const previousAspectBodies: AspectBodies[] = [
          { aspect: "opposite", bodies: ["sun", "moon"] },
          { aspect: "opposite", bodies: ["mars", "jupiter"] },
          { aspect: "square", bodies: ["sun", "mars"] },
          { aspect: "square", bodies: ["sun", "jupiter"] },
          { aspect: "square", bodies: ["moon", "mars"] },
          { aspect: "square", bodies: ["moon", "jupiter"] },
        ];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const grandCross = events.find((e) =>
          e.categories.includes("Grand Cross"),
        );

        expect(grandCross).toBeDefined();
        expect(grandCross?.categories).toContain("Dissolving");
      });

      it("does not detect Grand Cross with incomplete aspects", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        // Missing some squares - incomplete Grand Cross
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "opposite", bodies: ["sun", "moon"] },
          { aspect: "opposite", bodies: ["mars", "jupiter"] },
          { aspect: "square", bodies: ["sun", "mars"] },
        ];
        const previousAspectBodies: AspectBodies[] = [];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        const grandCross = events.find((e) =>
          e.categories.includes("Grand Cross"),
        );

        expect(grandCross).toBeUndefined();
      });
    });

    describe("kite composition", () => {
      it("detects Kite from Grand Trine plus opposition and sextiles", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        // Kite: Grand Trine (Sun-Moon-Mars) + Venus opposite Sun + Venus sextile Moon/Mars
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "trine", bodies: ["sun", "moon"] },
          { aspect: "trine", bodies: ["sun", "mars"] },
          { aspect: "trine", bodies: ["moon", "mars"] },
          { aspect: "opposite", bodies: ["sun", "venus"] },
          { aspect: "sextile", bodies: ["venus", "moon"] },
          { aspect: "sextile", bodies: ["venus", "mars"] },
        ];
        const previousAspectBodies: AspectBodies[] = [];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const kite = events.find((e) => e.categories.includes("Kite"));

        expect(kite).toBeDefined();
        expect(kite?.description).toContain("kite");
        expect(kite?.categories).toContain("Sun");
        expect(kite?.categories).toContain("Moon");
        expect(kite?.categories).toContain("Mars");
        expect(kite?.categories).toContain("Venus");
        expect(kite?.description).toContain("Venus focal");
      });

      it("does not detect Kite with incomplete aspects", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
        // Grand Trine present but missing sextiles
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "trine", bodies: ["sun", "moon"] },
          { aspect: "trine", bodies: ["sun", "mars"] },
          { aspect: "trine", bodies: ["moon", "mars"] },
          { aspect: "opposite", bodies: ["sun", "venus"] },
        ];
        const previousAspectBodies: AspectBodies[] = [];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        const kite = events.find((e) => e.categories.includes("Kite"));

        expect(kite).toBeUndefined();
      });
    });

    it("handles empty stored aspects", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const events = service.detect({
        currentAspectBodies: [],
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events).toHaveLength(0);
    });

    it("filters events outside current time window", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

      // Aspects that ended before current time
      const currentAspectBodies: AspectBodies[] = [];
      const previousAspectBodies: AspectBodies[] = [];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(0);
    });

    it("does not generate events for progressive aspects spanning multiple hours", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      // Grand Cross pattern but spans multiple hours
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] },
        { aspect: "opposite", bodies: ["mars", "jupiter"] },
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["moon", "mars"] },
        { aspect: "square", bodies: ["moon", "jupiter"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] },
        { aspect: "opposite", bodies: ["mars", "jupiter"] },
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["moon", "mars"] },
        { aspect: "square", bodies: ["moon", "jupiter"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      // No events - pattern exists in prev/current/next minutes
      expect(events).toHaveLength(0);
    });
  });

  describe("detectProgressive", () => {
    it("creates progressive events from forming and dissolving pairs", () => {
      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Quadruple Aspect",
          "Grand Cross",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Jupiter, Mars, Moon, Sun grand cross forming",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Grand Cross forming",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Quadruple Aspect",
          "Grand Cross",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Jupiter, Mars, Moon, Sun grand cross dissolving",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "Grand Cross dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.start).toStrictEqual(formingEvent.start);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolvingEvent.start);
      expect(progressiveEvents[0]?.description).toContain("grand cross");
      expect(progressiveEvents[0]?.categories).toContain("Quadruple Aspect");
    });

    it("handles multiple aspect types", () => {
      const grandCrossForming: Event = {
        categories: [
          "Quadruple Aspect",
          "Grand Cross",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Jupiter, Mars, Moon, Sun grand cross forming",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Grand Cross forming",
      };

      const grandCrossDissolving: Event = {
        categories: [
          "Quadruple Aspect",
          "Grand Cross",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Jupiter, Mars, Moon, Sun grand cross dissolving",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "Grand Cross dissolving",
      };

      const kiteForming: Event = {
        categories: [
          "Quadruple Aspect",
          "Kite",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Venus",
        ],
        description: "Mars, Moon, Sun, Venus kite forming (Venus focal)",
        end: moment.utc("2024-03-21T11:00:00.000Z"),
        start: moment.utc("2024-03-21T11:00:00.000Z"),
        summary: "Kite forming",
      };

      const kiteDissolving: Event = {
        categories: [
          "Quadruple Aspect",
          "Kite",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Venus",
        ],
        description: "Mars, Moon, Sun, Venus kite dissolving (Venus focal)",
        end: moment.utc("2024-03-21T15:00:00.000Z"),
        start: moment.utc("2024-03-21T15:00:00.000Z"),
        summary: "Kite dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        grandCrossForming,
        grandCrossDissolving,
        kiteForming,
        kiteDissolving,
      ]);

      expect(progressiveEvents).toHaveLength(2);
      expect(
        progressiveEvents.find((e) => e.description.includes("grand cross")),
      ).toBeDefined();
      expect(
        progressiveEvents.find((e) => e.description.includes("kite")),
      ).toBeDefined();
    });

    it("handles multiple body quartets", () => {
      const quartet1Forming: Event = {
        categories: [
          "Quadruple Aspect",
          "Grand Cross",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Sun, Moon, Mars, Jupiter grand cross forming",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Grand Cross forming",
      };

      const quartet1Dissolving: Event = {
        categories: [
          "Quadruple Aspect",
          "Grand Cross",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Sun, Moon, Mars, Jupiter grand cross dissolving",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "Grand Cross dissolving",
      };

      const quartet2Forming: Event = {
        categories: [
          "Quadruple Aspect",
          "Kite",
          "Forming",
          "Venus",
          "Mercury",
          "Saturn",
          "Uranus",
        ],
        description: "Venus, Mercury, Saturn, Uranus kite forming",
        end: moment.utc("2024-03-21T11:00:00.000Z"),
        start: moment.utc("2024-03-21T11:00:00.000Z"),
        summary: "Kite forming",
      };

      const quartet2Dissolving: Event = {
        categories: [
          "Quadruple Aspect",
          "Kite",
          "Dissolving",
          "Venus",
          "Mercury",
          "Saturn",
          "Uranus",
        ],
        description: "Venus, Mercury, Saturn, Uranus kite dissolving",
        end: moment.utc("2024-03-21T15:00:00.000Z"),
        start: moment.utc("2024-03-21T15:00:00.000Z"),
        summary: "Kite dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        quartet1Forming,
        quartet1Dissolving,
        quartet2Forming,
        quartet2Dissolving,
      ]);

      expect(progressiveEvents).toHaveLength(2);
      expect(
        progressiveEvents.find(
          (e) =>
            e.description.includes("Sun") &&
            e.description.includes("Moon") &&
            e.description.includes("Mars") &&
            e.description.includes("Jupiter"),
        ),
      ).toBeDefined();
      expect(
        progressiveEvents.find(
          (e) =>
            e.description.includes("Venus") &&
            e.description.includes("Mercury") &&
            e.description.includes("Saturn") &&
            e.description.includes("Uranus"),
        ),
      ).toBeDefined();
    });

    it("filters out non-quadruple-aspect events", () => {
      const quadrupleAspectEvent: Event = {
        categories: [
          "Quadruple Aspect",
          "Grand Cross",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Sun, Moon, Mars, Jupiter grand cross forming",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Grand Cross forming",
      };

      const nonQuadrupleAspectEvent: Event = {
        categories: ["Other"],
        description: "Not a quadruple aspect",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Some other event",
      };

      const progressiveEvents = service.detectProgressive([
        quadrupleAspectEvent,
        nonQuadrupleAspectEvent,
      ]);

      expect(
        progressiveEvents.every((e) =>
          e.categories.includes("Quadruple Aspect"),
        ),
      ).toBe(true);
    });

    it("handles empty events array", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("skips progressive when dissolving comes before forming", () => {
      const dissolvingEvent: Event = {
        categories: [
          "Quadruple Aspect",
          "Grand Cross",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Sun, Moon, Mars, Jupiter grand cross dissolving",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Grand Cross dissolving",
      };

      const formingEvent: Event = {
        categories: [
          "Quadruple Aspect",
          "Grand Cross",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Jupiter",
        ],
        description: "Sun, Moon, Mars, Jupiter grand cross forming",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "Grand Cross forming",
      };

      const progressiveEvents = service.detectProgressive([
        dissolvingEvent,
        formingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it.each([
      {
        caseName: "removes phase emojis from summary",
        dissolvingSummary: "⬅️ Grand Cross dissolving",
        formingSummary: "➡️ Grand Cross forming",
        validateProgressiveEvent: (event: Event | undefined): void => {
          expect(event?.summary).toBe("Grand Cross forming");
        },
      },
      {
        caseName: "removes phase text from description",
        dissolvingSummary: "Grand Cross dissolving",
        formingSummary: "Grand Cross forming",
        validateProgressiveEvent: (event: Event | undefined): void => {
          expect(event?.description).not.toMatch(
            /(forming|dissolving|perfective)/i,
          );
        },
      },
    ])(
      "$caseName",
      ({ dissolvingSummary, formingSummary, validateProgressiveEvent }) => {
        const formingEvent: Event = {
          categories: [
            "Quadruple Aspect",
            "Grand Cross",
            "Forming",
            "Sun",
            "Moon",
            "Mars",
            "Jupiter",
          ],
          description: "Jupiter, Mars, Moon, Sun grand cross forming",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: formingSummary,
        };

        const dissolvingEvent: Event = {
          categories: [
            "Quadruple Aspect",
            "Grand Cross",
            "Dissolving",
            "Sun",
            "Moon",
            "Mars",
            "Jupiter",
          ],
          description: "Jupiter, Mars, Moon, Sun grand cross dissolving",
          end: moment.utc("2024-03-21T14:00:00.000Z"),
          start: moment.utc("2024-03-21T14:00:00.000Z"),
          summary: dissolvingSummary,
        };

        const progressiveEvents = service.detectProgressive([
          formingEvent,
          dissolvingEvent,
        ]);

        expect(progressiveEvents).toHaveLength(1);

        validateProgressiveEvent(progressiveEvents[0]);
      },
    );

    it("preserves focal body information in description", () => {
      const formingEvent: Event = {
        categories: [
          "Quadruple Aspect",
          "Kite",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Venus",
          "Venus Focal",
        ],
        description: "Mars, Moon, Sun, Venus kite forming (Venus focal)",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "Kite forming",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Quadruple Aspect",
          "Kite",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Venus",
          "Venus Focal",
        ],
        description: "Mars, Moon, Sun, Venus kite dissolving (Venus focal)",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "Kite dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      // Focal info should be removed by the regex that removes phase text with optional focal info
      expect(progressiveEvents[0]?.description).not.toContain("forming");
      expect(progressiveEvents[0]?.description).not.toContain("dissolving");
    });

    it("covers the remaining quadruple-aspect helper branches", () => {
      const internals = baseService as unknown as {
        findGrandTrines: (
          trines: (AspectBodies | undefined)[],
          unionEdges: AspectBodies[],
        ) => Set<unknown>[];
        getPhaseEmoji: (
          phase: "dissolving" | "forming" | "perfective",
        ) => string;
        verifyGrandCrossSquares: (
          bodyList: string[],
          oppositeBodyMap: Map<string, string>,
          squareEdges: AspectBodies[],
        ) => boolean;
      };

      expect(internals.getPhaseEmoji("perfective")).toBe("🎯 ");
      expect(
        internals.findGrandTrines(
          [
            { aspect: "trine", bodies: ["sun", "moon"] },
            { aspect: "trine", bodies: ["moon", "mars"] },
            undefined,
          ],
          [{ aspect: "trine", bodies: ["sun", "moon"] }],
        ),
      ).toHaveLength(0);
      expect(
        internals.findGrandTrines(
          [
            { aspect: "trine", bodies: ["sun", "moon"] },
            { aspect: "trine", bodies: ["moon", "mars"] },
            { aspect: "trine", bodies: ["sun", "mars"] },
          ],
          [{ aspect: "trine", bodies: ["sun", "moon"] }],
        ),
      ).toHaveLength(0);
      expect(
        internals.verifyGrandCrossSquares(
          ["sun", "moon", "mars", "jupiter"],
          new Map([
            ["moon", "sun"],
            ["sun", "moon"],
          ]),
          [],
        ),
      ).toBe(false);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("involvesBody", () => {
    it("returns true when body1 matches", () => {
      const edge: AspectBodies = {
        aspect: "conjunct",
        bodies: ["sun", "moon"],
      };

      expect(service.involvesBody(edge, "sun")).toBe(true);
    });

    it("returns true when body2 matches", () => {
      const edge: AspectBodies = {
        aspect: "conjunct",
        bodies: ["sun", "moon"],
      };

      expect(service.involvesBody(edge, "moon")).toBe(true);
    });

    it("returns false when neither body matches", () => {
      const edge: AspectBodies = {
        aspect: "conjunct",
        bodies: ["sun", "moon"],
      };

      expect(service.involvesBody(edge, "mars")).toBe(false);
    });
  });

  describe("getOtherBody", () => {
    it("returns body2 when body1 is provided", () => {
      const edge: AspectBodies = {
        aspect: "conjunct",
        bodies: ["sun", "moon"],
      };

      expect(service.getOtherBody(edge, "sun")).toBe("moon");
    });

    it("returns body1 when body2 is provided", () => {
      const edge: AspectBodies = {
        aspect: "conjunct",
        bodies: ["sun", "moon"],
      };

      expect(service.getOtherBody(edge, "moon")).toBe("sun");
    });

    it("returns null when body is not in edge", () => {
      const edge: AspectBodies = {
        aspect: "conjunct",
        bodies: ["sun", "moon"],
      };

      expect(service.getOtherBody(edge, "mars")).toBeNull();
    });
  });

  describe("detect guard branches", () => {
    const getBaseInternals = (): {
      findGrandTrines: (
        trines: (AspectBodies | undefined)[],
        unionEdges: AspectBodies[],
      ) => Set<string>[];
      getOtherBody: (edge: AspectBodies, body: string) => null | string;
      getPhaseEmoji: (phase: string) => string;
      makeQuadrupleAspectCategories: (parameters: {
        body1Capitalized: string;
        body2Capitalized: string;
        body3Capitalized: string;
        body4Capitalized: string;
        phase: string;
        quadrupleAspect: string;
      }) => string[];
      verifyGrandCrossSquares: (
        bodies: string[],
        oppositesByBody: Map<string, string>,
        unionEdges: AspectBodies[],
      ) => boolean;
    } =>
      baseService as unknown as {
        findGrandTrines: (
          trines: (AspectBodies | undefined)[],
          unionEdges: AspectBodies[],
        ) => Set<string>[];
        getOtherBody: (edge: AspectBodies, body: string) => null | string;
        getPhaseEmoji: (phase: string) => string;
        makeQuadrupleAspectCategories: (parameters: {
          body1Capitalized: string;
          body2Capitalized: string;
          body3Capitalized: string;
          body4Capitalized: string;
          phase: string;
          quadrupleAspect: string;
        }) => string[];
        verifyGrandCrossSquares: (
          bodies: string[],
          oppositesByBody: Map<string, string>,
          unionEdges: AspectBodies[],
        ) => boolean;
      };

    it("returns null when tryBuildGrandCross fails square verification", () => {
      const result = (
        composerService as unknown as {
          tryBuildGrandCross: (args: {
            current: AspectBodies[];
            minute: moment.Moment;
            opp1: AspectBodies;
            opp2: AspectBodies;
            previous: AspectBodies[];
            unionEdges: AspectBodies[];
          }) => Event | null;
        }
      ).tryBuildGrandCross({
        current: [],
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        opp1: { aspect: "opposite", bodies: ["sun", "moon"] },
        opp2: { aspect: "opposite", bodies: ["mars", "jupiter"] },
        previous: [],
        unionEdges: [
          { aspect: "opposite", bodies: ["sun", "moon"] },
          { aspect: "opposite", bodies: ["mars", "jupiter"] },
        ],
      });

      expect(result).toBeNull();
    });

    it("returns null when resolveKiteEvent cannot build a complete 4-body event", () => {
      const determinePhaseSpy = vi
        .spyOn(compoundPhaseService, "determineCompoundPhaseFromSnapshots")
        .mockReturnValue({
          eventMinute: moment.utc("2024-03-21T12:00:00.000Z"),
          phase: "forming",
        });

      const result = (
        composerService as unknown as {
          resolveKiteEvent: (args: {
            baseBody: "sun";
            bodies: ("mars" | "moon" | "sun" | undefined)[];
            current: AspectBodies[];
            fourthBody: "venus";
            minute: moment.Moment;
            other0: "moon";
            other1: "mars";
            previous: AspectBodies[];
          }) => Event | null;
        }
      ).resolveKiteEvent({
        baseBody: "sun",
        bodies: ["sun", "moon", "mars", undefined],
        current: [],
        fourthBody: "venus",
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        other0: "moon",
        other1: "mars",
        previous: [],
      });

      expect(result).toBeNull();

      determinePhaseSpy.mockRestore();
    });

    it("returns null from checkTrineTriple when body tuple contains undefined", () => {
      const result = (
        baseService as unknown as {
          checkTrineTriple: (args: {
            trineI: AspectBodies;
            trineJ: AspectBodies;
            trineK: AspectBodies;
            unionEdges: AspectBodies[];
          }) => null | Set<string>;
        }
      ).checkTrineTriple({
        trineI: {
          aspect: "trine",
          bodies: ["sun", undefined] as unknown as ["sun", "moon"],
        },
        trineJ: { aspect: "trine", bodies: ["sun", "mars"] },
        trineK: { aspect: "trine", bodies: ["moon", "mars"] },
        unionEdges: [
          { aspect: "trine", bodies: ["sun", "moon"] },
          { aspect: "trine", bodies: ["sun", "mars"] },
          { aspect: "trine", bodies: ["moon", "mars"] },
        ],
      });

      expect(result).toBeNull();
    });

    it("skips undefined opposite entries while collecting grand crosses", () => {
      const events = composerService.collectGrandCrossesForOpp1({
        current: [],
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        opp1: { aspect: "opposite", bodies: ["sun", "moon"] },
        oppositions: [
          undefined as unknown as AspectBodies,
          { aspect: "opposite", bodies: ["mars", "jupiter"] },
        ],
        previous: [],
        startIndex: 0,
        unionEdges: [],
      });

      expect(events).toStrictEqual([]);
    });

    it("handles undefined sorted events while collecting progressive group events", () => {
      const progressiveEvents: Event[] = [];
      const sortBySpy = vi.spyOn(_, "sortBy").mockReturnValue([
        {
          categories: [
            "Quadruple Aspect",
            "Grand Cross",
            "Forming",
            "Sun",
            "Moon",
            "Mars",
            "Jupiter",
          ],
          description: "Sun, Moon, Mars, Jupiter grand cross forming",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "➡️ Grand Cross forming",
        },
        undefined,
        {
          categories: [
            "Quadruple Aspect",
            "Grand Cross",
            "Dissolving",
            "Sun",
            "Moon",
            "Mars",
            "Jupiter",
          ],
          description: "Sun, Moon, Mars, Jupiter grand cross dissolving",
          end: moment.utc("2024-03-21T14:00:00.000Z"),
          start: moment.utc("2024-03-21T14:00:00.000Z"),
          summary: "⬅️ Grand Cross dissolving",
        },
      ] as unknown);

      composerService.collectProgressiveEventsFromGroup([], progressiveEvents);

      expect(progressiveEvents).toHaveLength(1);

      sortBySpy.mockRestore();
    });

    it("returns null from tryBuildKite when focal body is already in grand-trine set", () => {
      const result = composerService.tryBuildKite({
        baseBody: "sun",
        current: [],
        gtBodies: new Set(["mars", "moon", "sun"]),
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        opp: { aspect: "opposite", bodies: ["sun", "moon"] },
        otherTwo: ["moon", "mars"],
        previous: [],
        unionEdges: [],
      });

      expect(result).toBeNull();
    });

    it("returns null from tryBuildKite when one supporting body is missing", () => {
      const result = composerService.tryBuildKite({
        baseBody: "sun",
        current: [],
        gtBodies: new Set(["mars", "moon", "sun"]),
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        opp: { aspect: "opposite", bodies: ["sun", "venus"] },
        otherTwo: ["moon"] as unknown as ["moon", "mars"],
        previous: [],
        unionEdges: [],
      });

      expect(result).toBeNull();
    });

    it("returns null from tryBuildKite when sextiles are missing", () => {
      const result = composerService.tryBuildKite({
        baseBody: "sun",
        current: [],
        gtBodies: new Set(["mars", "moon", "sun"]),
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        opp: { aspect: "opposite", bodies: ["sun", "venus"] },
        otherTwo: ["moon", "mars"],
        previous: [],
        unionEdges: [{ aspect: "sextile", bodies: ["venus", "moon"] }],
      });

      expect(result).toBeNull();
    });

    it("returns null from checkTrineTriple when required trine links are missing", () => {
      const result = (
        baseService as unknown as {
          checkTrineTriple: (args: {
            trineI: AspectBodies;
            trineJ: AspectBodies;
            trineK: AspectBodies;
            unionEdges: AspectBodies[];
          }) => null | Set<string>;
        }
      ).checkTrineTriple({
        trineI: { aspect: "trine", bodies: ["sun", "moon"] },
        trineJ: { aspect: "trine", bodies: ["sun", "mars"] },
        trineK: { aspect: "trine", bodies: ["moon", "mars"] },
        unionEdges: [
          { aspect: "trine", bodies: ["sun", "moon"] },
          { aspect: "trine", bodies: ["sun", "mars"] },
        ],
      });

      expect(result).toBeNull();
    });

    it("returns expected opposite body values in base helper", () => {
      const baseInternals = getBaseInternals();

      expect(
        baseInternals.getOtherBody(
          { aspect: "opposite", bodies: ["sun", "moon"] },
          "sun",
        ),
      ).toBe("moon");
      expect(
        baseInternals.getOtherBody(
          { aspect: "opposite", bodies: ["sun", "moon"] },
          "moon",
        ),
      ).toBe("sun");
      expect(
        baseInternals.getOtherBody(
          { aspect: "opposite", bodies: ["sun", "moon"] },
          "mars",
        ),
      ).toBeNull();
    });

    it("handles sparse trine arrays while scanning potential grand trines", () => {
      const baseInternals = getBaseInternals();
      const result = baseInternals.findGrandTrines(
        [
          { aspect: "trine", bodies: ["sun", "moon"] },
          undefined,
          { aspect: "trine", bodies: ["sun", "mars"] },
          { aspect: "trine", bodies: ["moon", "mars"] },
        ],
        [
          { aspect: "trine", bodies: ["sun", "moon"] },
          { aspect: "trine", bodies: ["sun", "mars"] },
          { aspect: "trine", bodies: ["moon", "mars"] },
        ],
      );

      expect(result).toHaveLength(1);
    });

    it("returns false when opposite-body mapping is missing during square verification", () => {
      const baseInternals = getBaseInternals();
      const verified = baseInternals.verifyGrandCrossSquares(
        ["sun", "moon", "mars", "jupiter"],
        new Map([
          ["moon", "sun"],
          ["sun", "moon"],
        ]),
        [],
      );

      expect(verified).toBe(false);
    });

    it("returns perfective phase marker in base helper", () => {
      const baseInternals = getBaseInternals();

      expect(baseInternals.getPhaseEmoji("perfective")).toBe("🎯 ");
    });

    it("returns false when a required square is missing during verification", () => {
      const baseInternals = getBaseInternals();
      const verified = baseInternals.verifyGrandCrossSquares(
        ["sun", "moon", "mars", "jupiter"],
        new Map([
          ["jupiter", "mars"],
          ["mars", "jupiter"],
          ["moon", "sun"],
          ["sun", "moon"],
        ]),
        [{ aspect: "square", bodies: ["sun", "mars"] }],
      );

      expect(verified).toBe(false);
    });

    it("returns the dissolving phase emoji in the base helper", () => {
      const baseInternals = getBaseInternals();

      expect(baseInternals.getPhaseEmoji("dissolving")).toBe("⬅️ ");
    });

    it("omits focal categories when no focal body is provided", () => {
      const baseInternals = getBaseInternals();

      expect(
        baseInternals.makeQuadrupleAspectCategories({
          body1Capitalized: "Sun",
          body2Capitalized: "Moon",
          body3Capitalized: "Mars",
          body4Capitalized: "Jupiter",
          phase: "forming",
          quadrupleAspect: "grand cross",
        }),
      ).not.toContain("Sun Focal");
    });
  });
});
