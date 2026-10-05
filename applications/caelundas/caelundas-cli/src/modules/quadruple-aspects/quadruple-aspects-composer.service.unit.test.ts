import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { QuadrupleAspectsBaseService } from "./quadruple-aspects-base.service";
import { QuadrupleAspectsComposerService } from "./quadruple-aspects-composer.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Aspect } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";

describe(QuadrupleAspectsComposerService, () => {
  let service: QuadrupleAspectsComposerService;
  let baseService: QuadrupleAspectsBaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CompoundPhaseService,
        QuadrupleAspectsComposerService,
        QuadrupleAspectsBaseService,
        AspectGraphService,
        AspectPhaseEmojiService,
      ],
    }).compile();

    service = await module.resolve(QuadrupleAspectsComposerService);
    baseService = await module.resolve(QuadrupleAspectsBaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns no grand crosses when minimum opposition/square counts are not met", () => {
    const minute = moment.utc("2024-03-21T12:00:00.000Z");

    const events = service.composeGrandCrosses({
      currentAspectBodies: [{ aspect: "opposite", bodies: ["sun", "moon"] }],
      minute,
      previousAspectBodies: [],
    });

    expect(events).toStrictEqual([]);
  });

  it("returns null when a grand-cross candidate does not contain four unique bodies", () => {
    const result = service.tryBuildGrandCross({
      current: [],
      minute: moment.utc("2024-03-21T12:00:00.000Z"),
      opp1: { aspect: "opposite", bodies: ["sun", "moon"] },
      opp2: { aspect: "opposite", bodies: ["sun", "mars"] },
      previous: [],
      unionEdges: [],
    });

    expect(result).toBeNull();
  });

  it("collects progressive events from forming to dissolving while skipping sparse entries", () => {
    const progressiveEvents: Event[] = [];
    const forming: Event = {
      categories: ["Quadruple Aspect", "Grand Cross", "Forming"],
      description: "forming",
      end: moment.utc("2024-03-21T10:00:00.000Z"),
      start: moment.utc("2024-03-21T10:00:00.000Z"),
      summary: "forming",
    };
    const dissolving: Event = {
      categories: ["Quadruple Aspect", "Grand Cross", "Dissolving"],
      description: "dissolving",
      end: moment.utc("2024-03-21T14:00:00.000Z"),
      start: moment.utc("2024-03-21T14:00:00.000Z"),
      summary: "dissolving",
    };

    service.collectProgressiveEventsFromGroup(
      [forming, undefined as unknown as Event, dissolving],
      progressiveEvents,
    );

    expect(progressiveEvents).toHaveLength(1);
    expect(progressiveEvents[0]?.start).toStrictEqual(forming.start);
    expect(progressiveEvents[0]?.end).toStrictEqual(dissolving.start);
  });

  it("skips non-dissolving candidates before pairing a dissolving boundary", () => {
    const progressiveEvents: Event[] = [];
    const forming: Event = {
      categories: ["Quadruple Aspect", "Grand Cross", "Forming"],
      description: "forming",
      end: moment.utc("2024-03-21T10:00:00.000Z"),
      start: moment.utc("2024-03-21T10:00:00.000Z"),
      summary: "forming",
    };
    const perfective: Event = {
      categories: ["Quadruple Aspect", "Grand Cross", "Perfective"],
      description: "perfective",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "perfective",
    };
    const dissolving: Event = {
      categories: ["Quadruple Aspect", "Grand Cross", "Dissolving"],
      description: "dissolving",
      end: moment.utc("2024-03-21T14:00:00.000Z"),
      start: moment.utc("2024-03-21T14:00:00.000Z"),
      summary: "dissolving",
    };

    service.collectProgressiveEventsFromGroup(
      [forming, perfective, dissolving],
      progressiveEvents,
    );

    expect(progressiveEvents).toHaveLength(1);
  });

  it("continues when opposition entries are sparse", () => {
    const minute = moment.utc("2024-03-21T12:00:00.000Z");
    const sparseOppositions: AspectBodies[] = [];
    sparseOppositions[1] = { aspect: "opposite", bodies: ["sun", "moon"] };
    sparseOppositions[2] = {
      aspect: "opposite",
      bodies: ["mars", "jupiter"],
    };
    const groupedAspects = new Map<Aspect, AspectBodies[]>([
      ["opposite", sparseOppositions],
      [
        "square",
        [
          { aspect: "square", bodies: ["sun", "mars"] },
          { aspect: "square", bodies: ["sun", "jupiter"] },
          { aspect: "square", bodies: ["moon", "mars"] },
          { aspect: "square", bodies: ["moon", "jupiter"] },
        ],
      ],
    ]);
    const groupAspectsByTypeSpy = vi
      .spyOn(baseService, "groupAspectsByType")
      .mockReturnValue(groupedAspects);
    const collectGrandCrossesForOpp1Spy = vi
      .spyOn(service, "collectGrandCrossesForOpp1")
      .mockReturnValue([]);

    const events = service.composeGrandCrosses({
      currentAspectBodies: [],
      minute,
      previousAspectBodies: [],
    });

    expect(events).toStrictEqual([]);
    expect(collectGrandCrossesForOpp1Spy).toHaveBeenCalledTimes(2);
    expect(collectGrandCrossesForOpp1Spy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        minute,
        startIndex: 2,
      }),
    );
    expect(collectGrandCrossesForOpp1Spy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        minute,
        startIndex: 3,
      }),
    );

    groupAspectsByTypeSpy.mockRestore();
    collectGrandCrossesForOpp1Spy.mockRestore();
  });
});
