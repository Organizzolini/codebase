import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { TripleAspectsComposerService } from "./triple-aspects-composer.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";

describe(TripleAspectsComposerService, () => {
  let service: TripleAspectsComposerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TripleAspectsComposerService,
        AspectGraphService,
        AspectPhaseEmojiService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(TripleAspectsComposerService);
    await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("aspect helpers", () => {
    it("finds bodies with a specific aspect", () => {
      const edges: AspectBodies[] = [
        { aspect: "conjunct", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["jupiter", "sun"] },
      ];

      const bodiesWithTrine = service.findBodiesWithAspectTo(
        "sun",
        "trine",
        edges,
      );

      expect(bodiesWithTrine).toContain("mars");
      expect(bodiesWithTrine).toContain("jupiter");
    });

    it("checks whether two bodies have an aspect", () => {
      const edges: AspectBodies[] = [
        { aspect: "conjunct", bodies: ["sun", "moon"] },
      ];

      expect(
        service.haveAspect({
          aspectType: "conjunct",
          body1: "sun",
          body2: "moon",
          edges,
        }),
      ).toBe(true);

      expect(
        service.haveAspect({
          aspectType: "trine",
          body1: "sun",
          body2: "moon",
          edges,
        }),
      ).toBe(false);
    });
  });

  describe("event composition", () => {
    it("builds a T-Square forming event", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");

      const event = service.buildTripleAspectEvent({
        body1: "sun",
        body2: "moon",
        body3: "mars",
        focalOrApexBody: "mars",
        phase: "forming",
        timestamp: minute,
        tripleAspect: "t-square",
      });

      expect(event.categories).toContain("Triple Aspect");
      expect(event.categories).toContain("T Square");
      expect(event.categories).toContain("Forming");
      expect(event.categories).toContain("Mars Focal");
      expect(event.start).toStrictEqual(minute);
    });

    it("pairs forming and dissolving events into one progressive event", () => {
      const forming: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "T Square",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Mars Focal",
        ],
        description: "Mars, Moon, Sun t-square forming (Mars focal)",
        end: moment.utc("2024-03-21T10:00:00.000Z"),
        start: moment.utc("2024-03-21T10:00:00.000Z"),
        summary: "T-Square forming",
      };

      const dissolving: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "T Square",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Mars Focal",
        ],
        description: "Mars, Moon, Sun t-square dissolving (Mars focal)",
        end: moment.utc("2024-03-21T14:00:00.000Z"),
        start: moment.utc("2024-03-21T14:00:00.000Z"),
        summary: "T-Square dissolving",
      };

      const progressiveEvents = service.pairProgressiveGroup([
        forming,
        dissolving,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.description).toContain("t-square");
      expect(progressiveEvents[0]?.categories).toContain("Triple Aspect");
      expect(progressiveEvents[0]?.categories).not.toContain("Forming");
      expect(progressiveEvents[0]?.categories).not.toContain("Dissolving");
    });
  });

  describe("progressive helpers", () => {
    it("derives progressive keys and phases", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const forming = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Grand Trine",
          "Forming",
          "Moon",
          "Sun",
          "Mars",
          "Mars Focal",
        ],
        description: "Moon, Sun, Mars grand trine forming",
        end: minute,
        start: minute,
        summary: "➡️ ✶ Moon-Sun-Mars Moon, Sun, Mars grand trine forming",
      } as Event;
      const dissolving = {
        ...forming,
        categories: forming.categories.map((category) =>
          category === "Forming" ? "Dissolving" : category,
        ),
        description: "Moon, Sun, Mars grand trine dissolving",
        end: minute.clone().add(1, "hour"),
        start: minute.clone().add(1, "hour"),
        summary: "⬅️ ✶ Moon-Sun-Mars Moon, Sun, Mars grand trine dissolving",
      };
      const compoundPhaseService = new CompoundPhaseService();

      expect(
        compoundPhaseService.determineCompoundPhaseFromSnapshots({
          checkPatternExists: (edges) => edges.length > 0,
          currentAspectBodies: [{ aspect: "trine", bodies: ["moon", "sun"] }],
          currentMinute: minute,
          patternBodies: ["moon", "sun", "mars"],
          previousAspectBodies: [],
        }),
      ).toStrictEqual({ eventMinute: minute, phase: "forming" });

      expect(
        compoundPhaseService.determineCompoundPhaseFromSnapshots({
          checkPatternExists: (edges) => edges.length > 0,
          currentAspectBodies: [],
          currentMinute: minute,
          patternBodies: ["moon", "sun", "mars"],
          previousAspectBodies: [{ aspect: "trine", bodies: ["moon", "sun"] }],
        })?.phase,
      ).toBe("dissolving");

      expect(
        compoundPhaseService.determineCompoundPhaseFromSnapshots({
          checkPatternExists: (edges) => edges.length > 0,
          currentAspectBodies: [{ aspect: "trine", bodies: ["moon", "sun"] }],
          currentMinute: minute,
          patternBodies: ["moon", "sun", "mars"],
          previousAspectBodies: [{ aspect: "trine", bodies: ["moon", "sun"] }],
        }),
      ).toBeNull();

      expect(service.getProgressiveGroupKey(forming)).toBe(
        "Mars-Moon-Sun-Grand Trine",
      );
      expect(
        service.getProgressiveGroupKey({ ...forming, categories: ["Moon"] }),
      ).toBe("");

      expect(service.pairProgressiveGroup([forming, dissolving])).toHaveLength(
        1,
      );
      expect(
        service.pairProgressiveGroup([
          { ...forming, end: minute, start: minute },
          { ...dissolving, start: minute },
        ]),
      ).toHaveLength(0);

      expect(
        service.buildProgressiveEvent({
          aspectCapitalized: "Mystery Aspect",
          dissolving,
          forming,
        }),
      ).toBeNull();

      expect(
        service.buildProgressiveEvent({
          aspectCapitalized: "Grand Trine",
          dissolving,
          forming: {
            ...forming,
            categories: forming.categories.map((category) =>
              category === "Mars" ? "Ceres" : category,
            ),
          },
        }),
      ).toBeNull();

      const yodProgressiveEvent = service.buildProgressiveEvent({
        aspectCapitalized: "Yod",
        dissolving,
        forming: {
          ...forming,
          categories: forming.categories.map((category) =>
            category === "Mars Focal" ? "Mars Focal" : category,
          ),
        },
      });

      expect(yodProgressiveEvent?.summary).toContain("(apex: Mars)");

      expect(
        service.buildProgressiveEvent({
          aspectCapitalized: "Grand Trine",
          dissolving,
          forming: {
            ...forming,
            categories: ["Astronomy", "Astrology", "Compound Aspect"],
          },
        }),
      ).toBeNull();
    });

    it("returns the dissolving phase emoji", () => {
      const internals = service as unknown as {
        getPhaseEmoji: (phase: string) => string;
      };

      expect(internals.getPhaseEmoji("dissolving")).toBe("⬅️ ");
    });

    it("returns the perfective phase emoji", () => {
      const internals = service as unknown as {
        getPhaseEmoji: (phase: string) => string;
      };

      expect(internals.getPhaseEmoji("perfective")).toBe("🎯 ");
    });

    it("skips progressive pairs without a recognized aspect label", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const forming = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
        ],
        description: "Sun, Moon, Mars forming",
        end: minute,
        start: minute,
        summary: "⬅️ Sun-Moon-Mars",
      } as Event;
      const dissolving = {
        ...forming,
        categories: forming.categories.map((category) =>
          category === "Forming" ? "Dissolving" : category,
        ),
        description: "Sun, Moon, Mars dissolving",
        end: minute.clone().add(1, "hour"),
        start: minute.clone().add(1, "hour"),
        summary: "⬅️ Sun-Moon-Mars",
      };

      expect(service.pairProgressiveGroup([forming, dissolving])).toHaveLength(
        0,
      );
    });

    it("skips sparse progressive pairs", () => {
      const internals = service as unknown as {
        pairProgressiveGroupPairs: (
          formingEvents: (Event | undefined)[],
          dissolvingEvents: (Event | undefined)[],
        ) => Event[];
        resolveAspectType: (aspectCapitalized: string) => null;
        resolveProgressiveMeta: (
          bodiesCapitalized: string[],
          aspect: "grand trine" | "t-square" | "yod",
        ) => null;
      };
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const forming = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Grand Trine",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
        ],
        description: "Sun, Moon, Mars grand trine forming",
        end: minute,
        start: minute,
        summary: "➡️ ✶ Sun-Moon-Mars",
      } as Event;
      const dissolving = {
        ...forming,
        categories: forming.categories.map((category) =>
          category === "Forming" ? "Dissolving" : category,
        ),
        description: "Sun, Moon, Mars grand trine dissolving",
        end: minute.clone().add(1, "hour"),
        start: minute.clone().add(1, "hour"),
        summary: "⬅️ ✶ Sun-Moon-Mars",
      };

      expect(
        internals.pairProgressiveGroupPairs([undefined], [dissolving]),
      ).toHaveLength(0);
      expect(internals.resolveAspectType("Mystery Aspect")).toBeNull();
      expect(
        internals.resolveProgressiveMeta(["Sun", "Moon", "Ceres"], "yod"),
      ).toBeNull();
    });

    it("sorts grouped events before pairing progressive triples", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const laterForming = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Grand Trine",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
        ],
        description: "Sun, Moon, Mars grand trine forming",
        end: minute.clone().add(1, "hour"),
        start: minute.clone().add(1, "hour"),
        summary: "➡️ ✶ Sun-Moon-Mars",
      } as Event;
      const earlierDissolving = {
        ...laterForming,
        categories: laterForming.categories.map((category) =>
          category === "Forming" ? "Dissolving" : category,
        ),
        description: "Sun, Moon, Mars grand trine dissolving",
        end: minute,
        start: minute,
        summary: "⬅️ ✶ Sun-Moon-Mars",
      };

      expect(
        service.pairProgressiveGroup([laterForming, earlierDissolving]),
      ).toHaveLength(0);
    });

    it("returns null when progressive bodies are incomplete", () => {
      const internals = service as unknown as {
        resolveProgressiveMeta: (
          bodiesCapitalized: string[],
          aspect: "grand trine" | "t-square" | "yod",
        ) => null;
      };

      expect(
        internals.resolveProgressiveMeta(["Sun", "Moon"], "yod"),
      ).toBeNull();
    });

    it("adds focal metadata for t-square progressive summaries", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const forming = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "T Square",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Mars Focal",
        ],
        description: "Mars, Moon, Sun t-square forming (Mars focal)",
        end: minute,
        start: minute,
        summary: "➡️ ⊤ ☀️-🌙-♂️ Mars, Moon, Sun t-square forming (Mars focal)",
      } as Event;
      const dissolving = {
        ...forming,
        categories: forming.categories.map((category) =>
          category === "Forming" ? "Dissolving" : category,
        ),
        description: "Mars, Moon, Sun t-square dissolving (Mars focal)",
        end: minute.clone().add(2, "hours"),
        start: minute.clone().add(2, "hours"),
        summary:
          "⬅️ ⊤ ☀️-🌙-♂️ Mars, Moon, Sun t-square dissolving (Mars focal)",
      };

      const progressiveEvent = service.buildProgressiveEvent({
        aspectCapitalized: "T Square",
        dissolving,
        forming,
      });

      expect(progressiveEvent?.description).toBe("Mars, Moon, Sun t-square");
      expect(progressiveEvent?.summary).toContain("(focal: Mars)");
    });

    it("skips push when a progressive pair resolves to null", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const forming = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Grand Trine",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
        ],
        description: "Sun, Moon, Mars grand trine forming",
        end: minute,
        start: minute,
        summary: "➡️ ✶ Sun-Moon-Mars",
      } as Event;
      const dissolving = {
        ...forming,
        categories: forming.categories.map((category) =>
          category === "Forming" ? "Dissolving" : category,
        ),
        description: "Sun, Moon, Mars grand trine dissolving",
        end: minute.clone().add(1, "hour"),
        start: minute.clone().add(1, "hour"),
        summary: "⬅️ ✶ Sun-Moon-Mars",
      };

      const buildProgressiveEventSpy = vi
        .spyOn(service, "buildProgressiveEvent")
        .mockReturnValueOnce(null);

      const results = (
        service as unknown as {
          pairProgressiveGroupPairs: (
            formingEvents: Event[],
            dissolvingEvents: Event[],
          ) => Event[];
        }
      ).pairProgressiveGroupPairs([forming], [dissolving]);

      expect(results).toStrictEqual([]);
      expect(buildProgressiveEventSpy).toHaveBeenCalledTimes(1);

      buildProgressiveEventSpy.mockRestore();
    });

    it("returns null when progressive body labels are fully absent", () => {
      const internals = service as unknown as {
        resolveProgressiveMeta: (
          bodiesCapitalized: string[],
          aspect: "grand trine" | "t-square" | "yod",
        ) => null;
      };

      expect(internals.resolveProgressiveMeta([], "grand trine")).toBeNull();
    });

    it("sorts multiple forming and dissolving events before pair resolution", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const formingLater = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Grand Trine",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
        ],
        description: "later forming",
        end: minute.clone().add(2, "hours"),
        start: minute.clone().add(2, "hours"),
        summary: "later forming",
      } as Event;
      const formingEarlier = {
        ...formingLater,
        description: "earlier forming",
        end: minute,
        start: minute,
        summary: "earlier forming",
      };
      const dissolvingLater = {
        ...formingLater,
        categories: formingLater.categories.map((category) =>
          category === "Forming" ? "Dissolving" : category,
        ),
        description: "later dissolving",
        end: minute.clone().add(4, "hours"),
        start: minute.clone().add(4, "hours"),
        summary: "later dissolving",
      };
      const dissolvingEarlier = {
        ...dissolvingLater,
        description: "earlier dissolving",
        end: minute.clone().add(1, "hour"),
        start: minute.clone().add(1, "hour"),
        summary: "earlier dissolving",
      };

      const internals = service as unknown as {
        pairProgressiveGroupPairs: (
          formingEvents: Event[],
          dissolvingEvents: Event[],
        ) => Event[];
      };
      const pairSpy = vi
        .spyOn(internals, "pairProgressiveGroupPairs")
        .mockReturnValueOnce([]);

      service.pairProgressiveGroup([
        formingLater,
        dissolvingLater,
        formingEarlier,
        dissolvingEarlier,
      ]);

      expect(pairSpy).toHaveBeenCalledTimes(1);

      const firstCall = pairSpy.mock.calls[0] as [Event[], Event[]] | undefined;

      expect(firstCall).toBeDefined();
      expect(firstCall?.[0].map((event) => event.description)).toStrictEqual([
        "earlier forming",
        "later forming",
      ]);
      expect(firstCall?.[1].map((event) => event.description)).toStrictEqual([
        "earlier dissolving",
        "later dissolving",
      ]);

      pairSpy.mockRestore();
    });
  });
});
