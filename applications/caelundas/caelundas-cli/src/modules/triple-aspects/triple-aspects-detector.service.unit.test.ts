import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { TripleAspectsComposerService } from "./triple-aspects-composer.service";
import { TripleAspectsDetectorService } from "./triple-aspects-detector.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Aspect } from "../caelundas/caelundas.types";

describe(TripleAspectsDetectorService, () => {
  let service: TripleAspectsDetectorService;
  let compoundPhaseService: CompoundPhaseService;
  let privateService: {
    checkTSquareFocalBody: (args: {
      body1: "sun";
      body2: "moon";
      currentAspectBodies: AspectBodies[];
      focalBody: "mars";
      minute: unknown;
      previousAspectBodies: AspectBodies[];
      unionEdges: AspectBodies[];
    }) => unknown;
    checkYodApexBody: (args: {
      apexBody: "venus";
      body1: "sun";
      body2: "moon";
      currentAspectBodies: AspectBodies[];
      minute: unknown;
      previousAspectBodies: AspectBodies[];
      unionEdges: AspectBodies[];
    }) => unknown;
    getUniqueBodyTriplets: (
      bodies: ("mars" | "moon" | "sun" | undefined)[],
    ) => unknown;
    groupAspectsByType: (edges: AspectBodies[]) => Map<Aspect, AspectBodies[]>;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TripleAspectsDetectorService,
        TripleAspectsComposerService,
        AspectGraphService,
        AspectPhaseEmojiService,
        CompoundPhaseService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    compoundPhaseService = await module.resolve(CompoundPhaseService);
    service = await module.resolve(TripleAspectsDetectorService);
    await module.resolve(LoggerService);
    privateService = service as unknown as typeof privateService;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("groupAspectsByType", () => {
    it("groups edges by aspect type", () => {
      const edges: AspectBodies[] = [
        { aspect: "conjunct", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        { aspect: "conjunct", bodies: ["venus", "saturn"] },
      ];

      const grouped = privateService.groupAspectsByType(edges);

      expect(grouped.size).toBe(2);
      expect(grouped.get("conjunct")?.length).toBe(2);
      expect(grouped.get("trine")?.length).toBe(1);
    });

    it("skips sparse triplets when one body entry is undefined", () => {
      const triplets = privateService.getUniqueBodyTriplets([
        "sun",
        undefined,
        "moon",
      ]);

      expect(triplets).toStrictEqual([]);
    });
  });

  describe("composeTSquares", () => {
    it("detects forming T-Square", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ];

      const events = service.composeTSquares({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]?.categories).toContain("T Square");
      expect(events[0]?.categories).toContain("Forming");
    });

    it("returns no T-Square events when phase transition cannot be determined", () => {
      const determinePhaseSpy = vi
        .spyOn(compoundPhaseService, "determineCompoundPhaseFromSnapshots")
        .mockReturnValue(null);
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ];

      const events = service.composeTSquares({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events).toStrictEqual([]);

      determinePhaseSpy.mockRestore();
    });

    it("returns null when focal body candidates do not form a full T-Square", () => {
      const result = privateService.checkTSquareFocalBody({
        body1: "sun",
        body2: "moon",
        currentAspectBodies: [],
        focalBody: "mars",
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        previousAspectBodies: [],
        unionEdges: [
          { aspect: "square", bodies: ["sun", "mars"] },
          { aspect: "square", bodies: ["moon", "mars"] },
        ],
      });

      expect(result).toBeNull();
    });
  });

  describe("composeYods", () => {
    it("detects forming Yod", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "quincunx", bodies: ["sun", "venus"] },
        { aspect: "quincunx", bodies: ["moon", "venus"] },
      ];

      const events = service.composeYods({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]?.categories).toContain("Yod");
      expect(events[0]?.categories).toContain("Forming");
    });

    it("returns no Yod events when apex candidates do not complete a yod", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "quincunx", bodies: ["sun", "venus"] },
      ];

      const events = service.composeYods({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events).toStrictEqual([]);
    });

    it("returns no Yod events when phase transition cannot be determined", () => {
      const determinePhaseSpy = vi
        .spyOn(compoundPhaseService, "determineCompoundPhaseFromSnapshots")
        .mockReturnValue(null);
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "quincunx", bodies: ["sun", "venus"] },
        { aspect: "quincunx", bodies: ["moon", "venus"] },
      ];

      const events = service.composeYods({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events).toStrictEqual([]);

      determinePhaseSpy.mockRestore();
    });

    it("returns null when apex candidates do not form a full Yod", () => {
      const result = privateService.checkYodApexBody({
        apexBody: "venus",
        body1: "sun",
        body2: "moon",
        currentAspectBodies: [],
        minute: moment.utc("2024-03-21T12:00:00.000Z"),
        previousAspectBodies: [],
        unionEdges: [
          { aspect: "quincunx", bodies: ["sun", "venus"] },
          { aspect: "quincunx", bodies: ["moon", "venus"] },
        ],
      });

      expect(result).toBeNull();
    });
  });

  describe("composeGrandTrines", () => {
    it("detects forming Grand Trine", () => {
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];

      const events = service.composeGrandTrines({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]?.categories).toContain("Grand Trine");
      expect(events[0]?.categories).toContain("Forming");
    });

    it("returns no Grand Trine events when phase transition cannot be determined", () => {
      const determinePhaseSpy = vi
        .spyOn(compoundPhaseService, "determineCompoundPhaseFromSnapshots")
        .mockReturnValue(null);
      const currentMinute = moment.utc("2024-03-21T12:00:00.000Z");
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];

      const events = service.composeGrandTrines({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies: [],
      });

      expect(events).toStrictEqual([]);

      determinePhaseSpy.mockRestore();
    });
  });
});
