import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";

import { StelliumService } from "./stellium.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";

describe(StelliumService, () => {
  let service: StelliumService;
  let compoundPhaseService: CompoundPhaseService;
  let privateService: {
    phaseEmojiFor: (phase: "dissolving" | "forming" | "perfective") => string;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AspectGraphService,
        CompoundPhaseService,
        ProgressiveCompoundEventService,
        StelliumService,
      ],
    }).compile();
    compoundPhaseService = await module.resolve(CompoundPhaseService);
    service = await module.resolve(StelliumService);
    privateService = service as unknown as typeof privateService;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detect", () => {
    describe("stellium composition", () => {
      it("does not generate perfective Stellium events (only forming/dissolving)", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        // 4-body stellium: Sun, Moon, Mars, Venus all in conjunction
        const edges: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["sun", "venus"] },
          { aspect: "conjunct", bodies: ["moon", "mars"] },
          { aspect: "conjunct", bodies: ["moon", "venus"] },
          { aspect: "conjunct", bodies: ["mars", "venus"] },
        ];
        const currentAspectBodies = edges;
        const previousAspectBodies = edges;

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        // Should return no events because pattern exists in prev/current/next (null phase)
        expect(events).toHaveLength(0);
      });

      it("detects forming Stellium when pattern appears", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        // Complete 4-body stellium only at current minute
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["sun", "venus"] },
          { aspect: "conjunct", bodies: ["moon", "mars"] },
          { aspect: "conjunct", bodies: ["moon", "venus"] },
          { aspect: "conjunct", bodies: ["mars", "venus"] },
        ];
        // Pattern doesn't exist at previous minute (only Sun-Moon was conjunct)
        const previousAspectBodies: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
        ];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const stellium = events.find((e) => e.categories.includes("Stellium"));

        expect(stellium).toBeDefined();
        expect(stellium?.categories).toContain("Forming");
        expect(stellium?.categories).toContain("4 Body");
      });

      it("returns empty array when fewer than 6 conjunctions exist", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        // Only 5 conjunctions (need 6 for 4-body stellium)
        const edges: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["sun", "venus"] },
          { aspect: "conjunct", bodies: ["moon", "mars"] },
          { aspect: "conjunct", bodies: ["moon", "venus"] },
        ];
        const currentAspectBodies = edges;
        const previousAspectBodies = edges;

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events).toHaveLength(0);
      });

      it("skips clusters with fewer than 4 bodies", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        // Two separate 3-body clusters (neither forms a stellium)
        const edges: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["moon", "mars"] },
          { aspect: "conjunct", bodies: ["jupiter", "venus"] },
          { aspect: "conjunct", bodies: ["jupiter", "saturn"] },
          { aspect: "conjunct", bodies: ["venus", "saturn"] },
        ];
        const currentAspectBodies = edges;
        const previousAspectBodies = edges;

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events).toHaveLength(0);
      });

      it("rejects incomplete stellium (not all pairs conjunct)", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        // 4 bodies but Mars-Venus conjunction is missing
        const edges: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["sun", "venus"] },
          { aspect: "conjunct", bodies: ["moon", "mars"] },
          { aspect: "conjunct", bodies: ["moon", "venus"] },
          // Mars-Venus conjunction missing
        ];
        const currentAspectBodies = edges;
        const previousAspectBodies = edges;

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events).toHaveLength(0);
      });

      it("returns empty array for invalid aspect events", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        const currentAspectBodies: AspectBodies[] = [];
        const previousAspectBodies: AspectBodies[] = [];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events).toHaveLength(0);
      });

      it("generates event with correct categories and description", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        // Complete 4-body stellium only at current minute
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["sun", "venus"] },
          { aspect: "conjunct", bodies: ["moon", "mars"] },
          { aspect: "conjunct", bodies: ["moon", "venus"] },
          { aspect: "conjunct", bodies: ["mars", "venus"] },
        ];
        // Pattern doesn't exist at previous minute (only Sun-Moon was conjunct)
        const previousAspectBodies: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
        ];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const stellium = events.find((e) => e.categories.includes("Stellium"));

        expect(stellium).toBeDefined();
        expect(stellium?.categories).toContain("Astronomy");
        expect(stellium?.categories).toContain("Astrology");
        expect(stellium?.categories).toContain("Compound Aspect");
        expect(stellium?.categories).toContain("Stellium");
        expect(stellium?.categories).toContain("4 Body");
        expect(stellium?.categories).toContain("Forming");
        expect(stellium?.summary).toContain("➡️");
        expect(stellium?.description).toContain("stellium forming");
      });

      it("detects 5-body stellium", () => {
        const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");

        // 5-body stellium: Sun, Moon, Mars, Venus, Jupiter (10 conjunctions)
        const currentAspectBodies: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["sun", "venus"] },
          { aspect: "conjunct", bodies: ["sun", "jupiter"] },
          { aspect: "conjunct", bodies: ["moon", "mars"] },
          { aspect: "conjunct", bodies: ["moon", "venus"] },
          { aspect: "conjunct", bodies: ["moon", "jupiter"] },
          { aspect: "conjunct", bodies: ["mars", "venus"] },
          { aspect: "conjunct", bodies: ["mars", "jupiter"] },
          { aspect: "conjunct", bodies: ["venus", "jupiter"] },
        ];
        // Pattern doesn't exist at previous minute (only Sun-Moon was conjunct)
        const previousAspectBodies: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "moon"] },
        ];

        const events = service.detect({
          currentAspectBodies,
          minute: currentMinute,
          previousAspectBodies,
        });

        expect(events.length).toBeGreaterThanOrEqual(1);

        const stellium = events.find((e) => e.categories.includes("5 Body"));

        expect(stellium).toBeDefined();
        expect(stellium?.categories).toContain("Stellium");
        expect(stellium?.categories).toContain("5 Body");
      });
    });
  });

  describe("detectProgressive", () => {
    it("returns empty array for empty input", () => {
      const events = service.detectProgressive([]);

      expect(events).toHaveLength(0);
    });

    it("returns empty array when no stellium events exist", () => {
      const events: Event[] = [
        {
          categories: ["Astronomy", "Astrology", "Simple Aspect"],
          description: "Sun conjunct Moon",
          end: moment.utc("2024-03-21T13:00:00.000Z"),
          start: moment.utc("2024-03-21T12:00:00.000Z"),
          summary: "Sun conjunct Moon",
        },
      ];

      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("covers the remaining private helper branches", () => {
      const internals = service as unknown as {
        allPairsConjunct: (
          bodies: (string | undefined)[],
          edges: AspectBodies[],
        ) => boolean;
        createStelliumEvent: (parameters: {
          bodies: string[];
          phase: "dissolving" | "forming" | "perfective";
          timestamp: moment.Moment;
        }) => Event;
        getNeighbor: (
          edge: AspectBodies,
          current: "mars" | "moon" | "sun",
        ) => "mars" | "moon" | "sun" | null;
        haveAspect: (args: {
          aspectType: "conjunct";
          body1: "moon" | "sun";
          body2: "moon" | "sun";
          edges: AspectBodies[];
        }) => boolean;
        pairStelliumGroup: (events: (Event | undefined)[]) => Event[];
        phaseEmojiFor: (
          phase: "dissolving" | "forming" | "perfective",
        ) => string;
      };

      expect(
        internals.getNeighbor(
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          "mars",
        ),
      ).toBeNull();
      expect(internals.phaseEmojiFor("perfective")).toBe("🎯 ");
      expect(
        internals.createStelliumEvent({
          bodies: ["sun", "moon", "mars", "venus", "jupiter", "saturn"],
          phase: "perfective",
          timestamp: moment.utc("2024-03-21T12:00:00.000Z"),
        }).summary,
      ).toContain("stellium perfective");
      expect(
        internals.pairStelliumGroup([
          {
            categories: [
              "Astronomy",
              "Astrology",
              "Compound Aspect",
              "Stellium",
              "4 Body",
            ],
            description: "No forming event",
            end: moment.utc("2024-03-21T12:00:00.000Z"),
            start: moment.utc("2024-03-21T12:00:00.000Z"),
            summary: "No forming event",
          },
          {
            categories: [
              "Astronomy",
              "Astrology",
              "Compound Aspect",
              "Stellium",
              "4 Body",
              "Forming",
            ],
            description: "Forming without dissolving",
            end: moment.utc("2024-03-21T12:30:00.000Z"),
            start: moment.utc("2024-03-21T12:30:00.000Z"),
            summary: "Forming without dissolving",
          },
        ]),
      ).toHaveLength(0);

      expect(
        internals.allPairsConjunct(
          ["sun", undefined, "moon"],
          [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
        ),
      ).toBe(true);
      expect(
        internals.allPairsConjunct(
          ["sun", undefined, "moon", "mars"],
          [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
        ),
      ).toBe(false);
      expect(internals.phaseEmojiFor("forming")).toBe("➡️ ");
      expect(internals.phaseEmojiFor("dissolving")).toBe("⬅️ ");
      expect(
        internals.haveAspect({
          aspectType: "conjunct",
          body1: "moon",
          body2: "sun",
          edges: [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
        }),
      ).toBe(true);
      expect(
        internals.pairStelliumGroup([
          {
            categories: [
              "Astronomy",
              "Astrology",
              "Compound Aspect",
              "Stellium",
              "4 Body",
              "Forming",
            ],
            description: "Forming with sparse follower",
            end: moment.utc("2024-03-21T12:00:00.000Z"),
            start: moment.utc("2024-03-21T12:00:00.000Z"),
            summary: "Forming with sparse follower",
          },
          undefined,
        ]),
      ).toHaveLength(0);
    });

    it("creates progressive event from forming to dissolving pair", () => {
      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Stellium",
          "4 Body",
          "Forming",
          "Mars",
          "Moon",
          "Sun",
          "Venus",
        ],
        description: "Mars, Moon, Sun, Venus stellium forming",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "➡️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium forming",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Stellium",
          "4 Body",
          "Dissolving",
          "Mars",
          "Moon",
          "Sun",
          "Venus",
        ],
        description: "Mars, Moon, Sun, Venus stellium dissolving",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "⬅️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.start).toStrictEqual(formingEvent.start);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolvingEvent.start);
      expect(progressiveEvents[0]?.summary).toContain(
        "Mars, Moon, Sun, Venus stellium",
      );
      expect(progressiveEvents[0]?.description).toBe(
        "Mars, Moon, Sun, Venus stellium",
      );
      expect(progressiveEvents[0]?.categories).not.toContain("Forming");
      expect(progressiveEvents[0]?.categories).not.toContain("Dissolving");
    });

    it("does not create progressive event when only forming exists", () => {
      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Stellium",
          "4 Body",
          "Forming",
          "Mars",
          "Moon",
          "Sun",
          "Venus",
        ],
        description: "Mars, Moon, Sun, Venus stellium forming",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "➡️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium forming",
      };

      const progressiveEvents = service.detectProgressive([formingEvent]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("does not create progressive event when only dissolving exists", () => {
      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Stellium",
          "4 Body",
          "Dissolving",
          "Mars",
          "Moon",
          "Sun",
          "Venus",
        ],
        description: "Mars, Moon, Sun, Venus stellium dissolving",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "⬅️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium dissolving",
      };

      const progressiveEvents = service.detectProgressive([dissolvingEvent]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("handles multiple forming/dissolving pairs", () => {
      const events: Event[] = [
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Forming",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium forming",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "➡️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium forming",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Dissolving",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium dissolving",
          end: moment.utc("2024-03-21T14:00:00.000Z"),
          start: moment.utc("2024-03-21T14:00:00.000Z"),
          summary: "⬅️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium dissolving",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Forming",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium forming",
          end: moment.utc("2024-03-22T10:00:00.000Z"),
          start: moment.utc("2024-03-22T10:00:00.000Z"),
          summary: "➡️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium forming",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Dissolving",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium dissolving",
          end: moment.utc("2024-03-22T14:00:00.000Z"),
          start: moment.utc("2024-03-22T14:00:00.000Z"),
          summary: "⬅️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium dissolving",
        },
      ];

      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(2);
      expect(progressiveEvents[0]?.start).toStrictEqual(
        moment.utc("2024-03-21T10:00:00.000Z"),
      );
      expect(progressiveEvents[0]?.end).toStrictEqual(
        moment.utc("2024-03-21T14:00:00.000Z"),
      );
      expect(progressiveEvents[1]?.start).toStrictEqual(
        moment.utc("2024-03-22T10:00:00.000Z"),
      );
      expect(progressiveEvents[1]?.end).toStrictEqual(
        moment.utc("2024-03-22T14:00:00.000Z"),
      );
    });

    it("handles different body combinations separately", () => {
      const events: Event[] = [
        // First body combination
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Forming",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium forming",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "➡️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium forming",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Dissolving",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium dissolving",
          end: moment.utc("2024-03-21T14:00:00.000Z"),
          start: moment.utc("2024-03-21T14:00:00.000Z"),
          summary: "⬅️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium dissolving",
        },
        // Different body combination
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Forming",
            "Jupiter",
            "Mars",
            "Saturn",
            "Sun",
          ],
          description: "Jupiter, Mars, Saturn, Sun stellium forming",
          end: moment.utc("2024-03-21T11:00:00.000Z"),
          start: moment.utc("2024-03-21T11:00:00.000Z"),
          summary: "➡️ ✨ ☉-♂-♃-♄ Jupiter, Mars, Saturn, Sun stellium forming",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Dissolving",
            "Jupiter",
            "Mars",
            "Saturn",
            "Sun",
          ],
          description: "Jupiter, Mars, Saturn, Sun stellium dissolving",
          end: moment.utc("2024-03-21T15:00:00.000Z"),
          start: moment.utc("2024-03-21T15:00:00.000Z"),
          summary:
            "⬅️ ✨ ☉-♂-♃-♄ Jupiter, Mars, Saturn, Sun stellium dissolving",
        },
      ];

      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(2);
      expect(progressiveEvents[0]?.categories).toContain("Venus");
      expect(progressiveEvents[0]?.categories).toContain("Moon");
      expect(progressiveEvents[1]?.categories).toContain("Jupiter");
      expect(progressiveEvents[1]?.categories).toContain("Saturn");
    });

    it("handles different stellium sizes separately", () => {
      const events: Event[] = [
        // 4-body stellium
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Forming",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium forming",
          end: moment.utc("2024-03-21T10:00:00.000Z"),
          start: moment.utc("2024-03-21T10:00:00.000Z"),
          summary: "➡️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium forming",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "4 Body",
            "Dissolving",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Mars, Moon, Sun, Venus stellium dissolving",
          end: moment.utc("2024-03-21T14:00:00.000Z"),
          start: moment.utc("2024-03-21T14:00:00.000Z"),
          summary: "⬅️ ✨ ☉-☽-♂-♀ Mars, Moon, Sun, Venus stellium dissolving",
        },
        // 5-body stellium with same bodies
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "5 Body",
            "Forming",
            "Jupiter",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Jupiter, Mars, Moon, Sun, Venus stellium forming",
          end: moment.utc("2024-03-21T11:00:00.000Z"),
          start: moment.utc("2024-03-21T11:00:00.000Z"),
          summary:
            "➡️ ✨ ☉-☽-♂-♃-♀ Jupiter, Mars, Moon, Sun, Venus stellium forming",
        },
        {
          categories: [
            "Astronomy",
            "Astrology",
            "Compound Aspect",
            "Stellium",
            "5 Body",
            "Dissolving",
            "Jupiter",
            "Mars",
            "Moon",
            "Sun",
            "Venus",
          ],
          description: "Jupiter, Mars, Moon, Sun, Venus stellium dissolving",
          end: moment.utc("2024-03-21T15:00:00.000Z"),
          start: moment.utc("2024-03-21T15:00:00.000Z"),
          summary:
            "⬅️ ✨ ☉-☽-♂-♃-♀ Jupiter, Mars, Moon, Sun, Venus stellium dissolving",
        },
      ];

      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(2);
      expect(progressiveEvents[0]?.categories).toContain("4 Body");
      expect(progressiveEvents[1]?.categories).toContain("5 Body");
    });
  });

  it("derives dissolving phase timestamp from previous-minute pattern", () => {
    const minute = moment.utc("2024-03-21T12:00:00.000Z");
    const result = compoundPhaseService.determineCompoundPhaseFromSnapshots({
      checkPatternExists: (edges) => edges.length > 0,
      currentAspectBodies: [],
      currentMinute: minute,
      patternBodies: ["sun", "moon"],
      previousAspectBodies: [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
    });

    expect(result?.phase).toBe("dissolving");
    expect(result?.eventMinute.toISOString()).toBe("2024-03-21T11:59:00.000Z");
  });

  it("returns perfective phase marker", () => {
    expect(privateService.phaseEmojiFor("perfective")).toBe("🎯 ");
  });

  it("returns dissolving phase marker", () => {
    expect(privateService.phaseEmojiFor("dissolving")).toBe("⬅️ ");
  });
});
