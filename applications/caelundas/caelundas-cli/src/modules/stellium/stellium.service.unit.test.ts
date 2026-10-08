import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";
import { aspectBodies } from "../caelundas/caelundas.constants";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { StelliumService } from "./stellium.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Body } from "../caelundas/caelundas.types";

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
        LoggerService,
        ProgressiveCompoundEventService,
        ProgressiveUtilitiesService,
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

      it("titles a stellium with its symbol and a span without its phase", () => {
        const formingMinute = moment.utc("2026-01-17T12:00:00.000Z");
        const dissolvingMinute = moment.utc("2026-01-19T08:00:00.000Z");
        const cluster: AspectBodies[] = [
          { aspect: "conjunct", bodies: ["sun", "mercury"] },
          { aspect: "conjunct", bodies: ["sun", "venus"] },
          { aspect: "conjunct", bodies: ["sun", "mars"] },
          { aspect: "conjunct", bodies: ["mercury", "venus"] },
          { aspect: "conjunct", bodies: ["mercury", "mars"] },
          { aspect: "conjunct", bodies: ["venus", "mars"] },
        ];
        const boundaries = [
          ...service.detect({
            currentAspectBodies: cluster,
            minute: formingMinute,
            previousAspectBodies: cluster.slice(1),
          }),
          ...service.detect({
            currentAspectBodies: cluster.slice(1),
            minute: dissolvingMinute,
            previousAspectBodies: cluster,
          }),
        ];

        const titles = [
          ...boundaries,
          ...service.detectProgressive(boundaries),
        ].map((event) => event.summary);

        expect(titles).toStrictEqual([
          "➡️ 🌟 ♂️-☿-☀️-♀️ Mars, Mercury, Sun, Venus stellium forming",
          "⬅️ 🌟 ♂️-☿-☀️-♀️ Mars, Mercury, Sun, Venus stellium dissolving",
          "🌟 ♂️-☿-☀️-♀️ Mars, Mercury, Sun, Venus stellium",
        ]);
      });

      it("refuses a stellium size that has no symbol", () => {
        const cluster = aspectBodies.slice(0, 13);
        const conjunctions = cluster.flatMap((first, index) =>
          cluster.slice(index + 1).map((second): AspectBodies => ({
            aspect: "conjunct",
            bodies: [first, second],
          })),
        );

        expect(() =>
          service.detect({
            currentAspectBodies: conjunctions,
            minute: moment.utc("2026-01-17T12:00:00.000Z"),
            previousAspectBodies: [],
          }),
        ).toThrow("No stellium symbol for 13 bodies");
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

    describe("maximal conjunction cliques", () => {
      /** Every pair of `members` as a conjunction. */
      function clique(...members: Body[]): AspectBodies[] {
        return members.flatMap((first, index) =>
          members.slice(index + 1).map((second): AspectBodies => ({
            aspect: "conjunct",
            bodies: [first, second],
          })),
        );
      }

      /** Descriptions of the stelliums detected at one minute, in order. */
      function describeDetected(
        previousAspectBodies: AspectBodies[],
        currentAspectBodies: AspectBodies[],
      ): string[] {
        return service
          .detect({
            currentAspectBodies,
            minute: moment.utc("2026-01-15T07:48:00.000Z"),
            previousAspectBodies,
          })
          .map((event) => event.description)
          .toSorted();
      }

      it("reports a stellium inside a conjunction component that is not a clique", () => {
        // 15 January 2026: Mars, Mercury, Sun and Venus are one stellium, and
        // Vesta and Pluto are conjunct with only some of it. The Sun-Pluto leg
        // closes a second stellium inside the same component.
        const before = [
          ...clique("mars", "mercury", "sun", "venus"),
          ...clique("pluto", "venus", "vesta"),
          { aspect: "conjunct", bodies: ["sun", "vesta"] },
        ] satisfies AspectBodies[];
        const after = [
          ...before,
          { aspect: "conjunct", bodies: ["sun", "pluto"] },
        ] satisfies AspectBodies[];

        expect(describeDetected(before, after)).toStrictEqual([
          "Pluto, Sun, Venus, Vesta stellium forming",
        ]);
      });

      it("reports overlapping stelliums that share bodies", () => {
        // 19 December 2025: Mars is conjunct with Juno, the Moon and the Sun
        // but not Venus, so the Moon-Mars leg forms a second stellium beside
        // Juno, Moon, Sun, Venus without disturbing it.
        const before = [
          ...clique("juno", "moon", "sun", "venus"),
          ...clique("juno", "mars", "sun"),
        ];
        const after = [
          ...before,
          { aspect: "conjunct", bodies: ["moon", "mars"] },
        ] satisfies AspectBodies[];

        expect(describeDetected(before, after)).toStrictEqual([
          "Juno, Mars, Moon, Sun stellium forming",
        ]);
      });

      it("reports no stellium that lies inside a larger one", () => {
        expect(
          describeDetected(
            [],
            clique("mars", "mercury", "sun", "venus", "vesta"),
          ),
        ).toStrictEqual(["Mars, Mercury, Sun, Venus, Vesta stellium forming"]);
      });

      it("dissolves a stellium and forms the larger one when a body joins", () => {
        // 17 January 2026, 19:50 UT: the Mercury-Pluto leg turns two 5-body
        // stelliums into one 6-body stellium.
        const before = [
          ...clique("mars", "mercury", "sun", "venus", "vesta"),
          ...clique("mars", "pluto", "sun", "venus", "vesta"),
        ];
        const after = [
          ...before,
          { aspect: "conjunct", bodies: ["mercury", "pluto"] },
        ] satisfies AspectBodies[];

        expect(describeDetected(before, after)).toStrictEqual([
          "Mars, Mercury, Pluto, Sun, Venus, Vesta stellium forming",
          "Mars, Mercury, Sun, Venus, Vesta stellium dissolving",
          "Mars, Pluto, Sun, Venus, Vesta stellium dissolving",
        ]);
      });

      it("dissolves a stellium and forms the smaller one when a body leaves", () => {
        const before = clique("moon", "pluto", "sun", "venus", "vesta");
        const after = before.filter(
          (edge) =>
            !(edge.bodies.includes("moon") && edge.bodies.includes("sun")),
        );

        expect(describeDetected(before, after)).toStrictEqual([
          "Moon, Pluto, Sun, Venus, Vesta stellium dissolving",
          "Moon, Pluto, Venus, Vesta stellium forming",
          "Pluto, Sun, Venus, Vesta stellium forming",
        ]);
      });

      it("reports a stellium once when its legs are in both snapshots twice", () => {
        const legs = clique("mars", "mercury", "sun", "venus");
        const reversed = legs.map((edge): AspectBodies => ({
          aspect: edge.aspect,
          bodies: [edge.bodies[1], edge.bodies[0]],
        }));

        expect(
          describeDetected(legs.slice(1), [...legs, ...reversed]),
        ).toStrictEqual(["Mars, Mercury, Sun, Venus stellium forming"]);
      });
    });
  });

  describe("detectProgressive", () => {
    /** The boundary `detect` emits when `members` gain or lose their last leg. */
    function boundary(
      members: Body[],
      phase: "dissolving" | "forming",
      time: string,
    ): DetectedCalendarEvent[] {
      const legs = members.flatMap((first, index) =>
        members.slice(index + 1).map((second): AspectBodies => ({
          aspect: "conjunct",
          bodies: [first, second],
        })),
      );
      const [complete, broken] = [legs, legs.slice(1)];
      return service.detect({
        currentAspectBodies: phase === "forming" ? complete : broken,
        minute: moment.utc(time),
        previousAspectBodies: phase === "forming" ? broken : complete,
      });
    }

    /** Each span as "start → end". */
    function spansOf(events: DetectedCalendarEvent[]): string[] {
      return service
        .detectProgressive(events)
        .map(
          (event) =>
            `${event.start.toISOString()} → ${event.end.toISOString()}`,
        );
    }

    const members: Body[] = ["mars", "mercury", "sun", "venus"];

    it("does not bridge a forming with no dissolving to a later occurrence's", () => {
      expect(
        spansOf([
          ...boundary(members, "forming", "2026-01-15T00:00:00.000Z"),
          ...boundary(members, "forming", "2026-01-16T00:00:00.000Z"),
          ...boundary(members, "dissolving", "2026-01-17T00:00:00.000Z"),
        ]),
      ).toStrictEqual(["2026-01-16T00:00:00.000Z → 2026-01-17T00:00:00.000Z"]);
    });

    it("spans a stellium once when its boundaries repeat", () => {
      const forming = boundary(members, "forming", "2026-01-15T00:00:00.000Z");
      const dissolving = boundary(
        members,
        "dissolving",
        "2026-01-17T00:00:00.000Z",
      );

      expect(
        spansOf([...forming, ...forming, ...dissolving, ...dissolving]),
      ).toStrictEqual(["2026-01-15T00:00:00.000Z → 2026-01-17T00:00:00.000Z"]);
    });

    it("drops a stellium that forms and dissolves on the same minute", () => {
      expect(
        spansOf([
          ...boundary(members, "forming", "2026-01-15T00:00:00.000Z"),
          ...boundary(members, "dissolving", "2026-01-15T00:00:00.000Z"),
        ]),
      ).toStrictEqual([]);
    });

    it("returns empty array for empty input", () => {
      const events = service.detectProgressive([]);

      expect(events).toHaveLength(0);
    });

    it("returns empty array when no stellium events exist", () => {
      const events: DetectedCalendarEvent[] = [
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

    it("creates progressive event from forming to dissolving pair", () => {
      const formingEvent: DetectedCalendarEvent = {
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

      const dissolvingEvent: DetectedCalendarEvent = {
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
      const formingEvent: DetectedCalendarEvent = {
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
      const dissolvingEvent: DetectedCalendarEvent = {
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
      const events: DetectedCalendarEvent[] = [
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
      const events: DetectedCalendarEvent[] = [
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
      const events: DetectedCalendarEvent[] = [
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

  it("stamps dissolving at the first minute the pattern is gone", () => {
    const minute = moment.utc("2024-03-21T12:00:00.000Z");
    const result = compoundPhaseService.determineCompoundPhaseFromSnapshots({
      checkPatternExists: (edges) => edges.length > 0,
      currentAspectBodies: [],
      currentMinute: minute,
      patternBodies: ["sun", "moon"],
      previousAspectBodies: [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
    });

    expect(result?.phase).toBe("dissolving");
    expect(result?.eventMinute.toISOString()).toBe("2024-03-21T12:00:00.000Z");
  });

  it("returns perfective phase marker", () => {
    expect(privateService.phaseEmojiFor("perfective")).toBe("🎯 ");
  });

  it("returns dissolving phase marker", () => {
    expect(privateService.phaseEmojiFor("dissolving")).toBe("⬅️ ");
  });
});
