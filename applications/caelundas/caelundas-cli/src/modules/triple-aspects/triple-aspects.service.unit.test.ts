import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { TripleAspectsComposerService } from "./triple-aspects-composer.service";
import { TripleAspectsDetectorService } from "./triple-aspects-detector.service";
import { TripleAspectsService } from "./triple-aspects.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";

describe(TripleAspectsService, () => {
  let service: TripleAspectsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoggerService,
        AspectGraphService,
        AspectPhaseEmojiService,
        CompoundPhaseService,
        TripleAspectsComposerService,
        TripleAspectsDetectorService,
        TripleAspectsService,
      ],
    }).compile();
    service = await module.resolve(TripleAspectsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detect", () => {
    it("returns no events when both snapshots are empty", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const events = service.detect({
        currentAspectBodies: [],
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events).toHaveLength(0);
    });

    it("detects at least one triple-aspect event when a valid pattern forms", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]?.categories).toContain("Triple Aspect");
    });
  });

  describe("detectProgressive", () => {
    it("creates progressive event from matching forming and dissolving pair", () => {
      const formingEvent: Event = {
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

      const dissolvingEvent: Event = {
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

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.description).toContain("t-square");
      expect(progressiveEvents[0]?.categories).toContain("Triple Aspect");
    });

    it("skips events without a progressive group key", () => {
      const events = service.detectProgressive([
        {
          categories: ["Astronomy", "Astrology", "Triple Aspect", "Forming"],
          description: "Invalid triple aspect",
          end: moment.utc("2024-03-21T12:00:00.000Z"),
          start: moment.utc("2024-03-21T12:00:00.000Z"),
          summary: "Invalid triple aspect",
        },
      ]);

      expect(events).toStrictEqual([]);
    });
  });

  describe("compatibility static wrappers", () => {
    it("groupAspectsByType delegates and groups correctly", () => {
      const edges: AspectBodies[] = [
        { aspect: "conjunct", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        { aspect: "conjunct", bodies: ["venus", "saturn"] },
      ];

      const grouped = TripleAspectsService.groupAspectsByType(edges);

      expect(grouped.get("conjunct")?.length).toBe(2);
      expect(grouped.get("trine")?.length).toBe(1);
    });

    it("findBodiesWithAspectTo delegates and returns connected bodies", () => {
      const edges: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["jupiter", "sun"] },
      ];

      const bodies = TripleAspectsService.findBodiesWithAspectTo(
        "sun",
        "trine",
        edges,
      );

      expect(bodies).toContain("mars");
      expect(bodies).toContain("jupiter");
    });

    it("haveAspect delegates and resolves both body orders", () => {
      const edges: AspectBodies[] = [
        { aspect: "conjunct", bodies: ["sun", "moon"] },
      ];

      expect(
        TripleAspectsService.haveAspect({
          aspectType: "conjunct",
          body1: "sun",
          body2: "moon",
          edges,
        }),
      ).toBe(true);
      expect(
        TripleAspectsService.haveAspect({
          aspectType: "conjunct",
          body1: "moon",
          body2: "sun",
          edges,
        }),
      ).toBe(true);
    });
  });
});
