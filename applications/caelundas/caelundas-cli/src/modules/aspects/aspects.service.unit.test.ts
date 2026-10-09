import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MajorAspectEventService } from "../major-aspects/major-aspect-event.service";
import { MajorAspectProgressiveService } from "../major-aspects/major-aspect-progressive.service";
import { MajorAspectsService } from "../major-aspects/major-aspects.service";
import { MathService } from "../math/math.service";
import { MinorAspectsComposerService } from "../minor-aspects/minor-aspects-composer.service";
import { MinorAspectsEventService } from "../minor-aspects/minor-aspects-event.service";
import { MinorAspectsProgressiveService } from "../minor-aspects/minor-aspects-progressive.service";
import { MinorAspectsService } from "../minor-aspects/minor-aspects.service";
import { ProgressiveAspectService } from "../progressive/progressive-aspect.service";
import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";
import { QuadrupleAspectsBaseService } from "../quadruple-aspects/quadruple-aspects-base.service";
import { QuadrupleAspectsComposerService } from "../quadruple-aspects/quadruple-aspects-composer.service";
import { QuadrupleAspectsService } from "../quadruple-aspects/quadruple-aspects.service";
import { QuintupleAspectsComposerService } from "../quintuple-aspects/quintuple-aspects-composer.service";
import { QuintupleAspectsService } from "../quintuple-aspects/quintuple-aspects.service";
import { SextupleAspectsComposerService } from "../sextuple-aspects/sextuple-aspects-composer.service";
import { SextupleAspectsService } from "../sextuple-aspects/sextuple-aspects.service";
import { SpecialtyAspectsComposerService } from "../specialty-aspects/specialty-aspects-composer.service";
import { SpecialtyAspectsEventService } from "../specialty-aspects/specialty-aspects-event.service";
import { SpecialtyAspectsProgressiveService } from "../specialty-aspects/specialty-aspects-progressive.service";
import { SpecialtyAspectsService } from "../specialty-aspects/specialty-aspects.service";
import { StelliumService } from "../stellium/stellium.service";
import { TripleAspectsComposerService } from "../triple-aspects/triple-aspects-composer.service";
import { TripleAspectsDetectorService } from "../triple-aspects/triple-aspects-detector.service";
import { TripleAspectsService } from "../triple-aspects/triple-aspects.service";

import { AspectEphemerisService } from "./aspect-ephemeris.service";
import { AspectEventFormattingService } from "./aspect-event-formatting.service";
import { AspectGraphService } from "./aspect-graph.service";
import { AspectPhaseEmojiService } from "./aspect-phase-emoji.service";
import { AspectsUtilitiesService } from "./aspects-utilities.service";
import {
  COMPOSITE_ASPECT_DETECTORS_TOKEN,
  PROGRESSIVE_ASPECT_DETECTORS_TOKEN,
  SIMPLE_ASPECT_DETECTORS_TOKEN,
} from "./aspects.constants";
import { AspectsService } from "./aspects.service";
import { CompoundPhaseService } from "./compound-phase.service";
import { ProgressiveCompoundEventService } from "./progressive-compound-event.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Body } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type {
  AspectBodies,
  CompositeAspectDetector,
  ProgressiveAspectDetector,
  SimpleAspectDetector,
} from "./aspects.types";

describe(AspectsService, () => {
  let service: AspectsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        LoggerService,
        AspectsService,
        AspectsUtilitiesService,
        AspectEphemerisService,
        AspectEventFormattingService,
        AspectGraphService,
        AspectPhaseEmojiService,
        CompoundPhaseService,
        MajorAspectsService,
        MajorAspectEventService,
        MajorAspectProgressiveService,
        MathService,
        MinorAspectsService,
        MinorAspectsComposerService,
        MinorAspectsEventService,
        MinorAspectsProgressiveService,
        ProgressiveCompoundEventService,
        ProgressiveAspectService,
        ProgressiveUtilitiesService,
        QuadrupleAspectsService,
        QuadrupleAspectsBaseService,
        QuadrupleAspectsComposerService,
        QuintupleAspectsService,
        QuintupleAspectsComposerService,
        SextupleAspectsService,
        SextupleAspectsComposerService,
        SpecialtyAspectsService,
        SpecialtyAspectsComposerService,
        SpecialtyAspectsEventService,
        SpecialtyAspectsProgressiveService,
        StelliumService,
        TripleAspectsService,
        TripleAspectsComposerService,
        TripleAspectsDetectorService,
        {
          inject: [
            MajorAspectsService,
            MinorAspectsService,
            SpecialtyAspectsService,
          ],
          provide: SIMPLE_ASPECT_DETECTORS_TOKEN,
          useFactory: (
            majorAspectsService: MajorAspectsService,
            minorAspectsService: MinorAspectsService,
            specialtyAspectsService: SpecialtyAspectsService,
          ) => [
            majorAspectsService,
            minorAspectsService,
            specialtyAspectsService,
          ],
        },
        {
          inject: [
            TripleAspectsService,
            QuadrupleAspectsService,
            QuintupleAspectsService,
            SextupleAspectsService,
            StelliumService,
          ],
          provide: COMPOSITE_ASPECT_DETECTORS_TOKEN,
          useFactory: (
            tripleAspectsService: TripleAspectsService,
            quadrupleAspectsService: QuadrupleAspectsService,
            quintupleAspectsService: QuintupleAspectsService,
            sextupleAspectsService: SextupleAspectsService,
            stelliumService: StelliumService,
          ) => [
            tripleAspectsService,
            quadrupleAspectsService,
            quintupleAspectsService,
            sextupleAspectsService,
            stelliumService,
          ],
        },
        {
          inject: [
            MajorAspectsService,
            MinorAspectsService,
            SpecialtyAspectsService,
            TripleAspectsService,
            QuadrupleAspectsService,
            QuintupleAspectsService,
            SextupleAspectsService,
            StelliumService,
          ],
          provide: PROGRESSIVE_ASPECT_DETECTORS_TOKEN,
          useFactory: (
            majorAspectsService: MajorAspectsService,
            minorAspectsService: MinorAspectsService,
            specialtyAspectsService: SpecialtyAspectsService,
            tripleAspectsService: TripleAspectsService,
            quadrupleAspectsService: QuadrupleAspectsService,
            quintupleAspectsService: QuintupleAspectsService,
            sextupleAspectsService: SextupleAspectsService,
            stelliumService: StelliumService,
          ) => [
            majorAspectsService,
            minorAspectsService,
            specialtyAspectsService,
            tripleAspectsService,
            quadrupleAspectsService,
            quintupleAspectsService,
            sextupleAspectsService,
            stelliumService,
          ],
        },
      ],
    }).compile();

    service = await module.resolve(AspectsService);
  });

  describe("computeAspectBodies", () => {
    const timestamp = moment.utc("2026-01-21T12:00:00Z");

    function createAspectEvent(args: {
      aspectType: string;
      body1: string;
      body2: string;
      phase: "Dissolving" | "Forming" | "Perfective";
    }): DetectedCalendarEvent {
      return {
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Major Aspect",
          args.body1,
          args.body2,
          args.aspectType,
          args.phase,
        ],
        description: "",
        end: timestamp,
        start: timestamp,
        summary: `${args.body1} ${args.phase.toLowerCase()} ${args.aspectType} ${args.body2}`,
      };
    }

    it("returns empty array when given no previous state and no events", () => {
      expect(service.computeAspectBodies([], [])).toStrictEqual([]);
    });

    it("adds an aspect on forming and ignores perfective", () => {
      const result = service.computeAspectBodies(
        [],
        [
          createAspectEvent({
            aspectType: "Conjunct",
            body1: "Sun",
            body2: "Moon",
            phase: "Forming",
          }),
          createAspectEvent({
            aspectType: "Conjunct",
            body1: "Sun",
            body2: "Moon",
            phase: "Perfective",
          }),
        ],
      );

      expect(result).toStrictEqual([
        {
          aspect: "conjunct",
          bodies: ["sun", "moon"],
        },
      ]);
    });

    it("removes an aspect on dissolving", () => {
      const afterForming = service.computeAspectBodies(
        [],
        [
          createAspectEvent({
            aspectType: "Conjunct",
            body1: "Sun",
            body2: "Moon",
            phase: "Forming",
          }),
        ],
      );

      const result = service.computeAspectBodies(afterForming, [
        createAspectEvent({
          aspectType: "Conjunct",
          body1: "Sun",
          body2: "Moon",
          phase: "Dissolving",
        }),
      ]);

      expect(result).toStrictEqual([]);
    });

    it("uses canonical key regardless of body order", () => {
      const afterForming = service.computeAspectBodies(
        [],
        [
          createAspectEvent({
            aspectType: "Conjunct",
            body1: "Moon",
            body2: "Sun",
            phase: "Forming",
          }),
        ],
      );

      const result = service.computeAspectBodies(afterForming, [
        createAspectEvent({
          aspectType: "Conjunct",
          body1: "Sun",
          body2: "Moon",
          phase: "Dissolving",
        }),
      ]);

      expect(result).toStrictEqual([]);
    });

    it("tracks different aspect types for the same pair", () => {
      const result = service.computeAspectBodies(
        [],
        [
          createAspectEvent({
            aspectType: "Conjunct",
            body1: "Sun",
            body2: "Moon",
            phase: "Forming",
          }),
          createAspectEvent({
            aspectType: "Sextile",
            body1: "Sun",
            body2: "Moon",
            phase: "Forming",
          }),
        ],
      );

      expect(result).toHaveLength(2);
      expect(result).toStrictEqual(
        expect.arrayContaining([
          { aspect: "conjunct", bodies: ["sun", "moon"] },
          { aspect: "sextile", bodies: ["sun", "moon"] },
        ]),
      );
    });

    it("skips non-simple-aspect events", () => {
      const result = service.computeAspectBodies(
        [],
        [
          {
            categories: ["Astronomy", "Ingress", "Moon", "Aries"],
            description: "",
            end: timestamp,
            start: timestamp,
            summary: "Moon enters Aries",
          },
        ],
      );

      expect(result).toStrictEqual([]);
    });

    it("skips simple-aspect events without forming or dissolving phase", () => {
      const result = service.computeAspectBodies(
        [],
        [
          {
            categories: [
              "Astronomy",
              "Astrology",
              "Simple Aspect",
              "Major Aspect",
              "Sun",
              "Moon",
              "Conjunct",
            ],
            description: "",
            end: timestamp,
            start: timestamp,
            summary: "Sun conjunct Moon",
          },
        ],
      );

      expect(result).toStrictEqual([]);
    });

    it("skips simple-aspect events with invalid aspect names", () => {
      const result = service.computeAspectBodies(
        [],
        [
          {
            categories: [
              "Astronomy",
              "Astrology",
              "Simple Aspect",
              "Major Aspect",
              "Sun",
              "Moon",
              "NotAnAspect",
              "Forming",
            ],
            description: "",
            end: timestamp,
            start: timestamp,
            summary: "Invalid",
          },
        ],
      );

      expect(result).toStrictEqual([]);
    });

    it("skips simple-aspect events that do not include exactly two bodies", () => {
      const result = service.computeAspectBodies(
        [],
        [
          {
            categories: [
              "Astronomy",
              "Astrology",
              "Simple Aspect",
              "Major Aspect",
              "Sun",
              "Conjunct",
              "Forming",
            ],
            description: "",
            end: timestamp,
            start: timestamp,
            summary: "Invalid body count",
          },
        ],
      );

      expect(result).toStrictEqual([]);
    });

    it("does not duplicate an already-active forming aspect", () => {
      const result = service.computeAspectBodies(
        [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
        [
          createAspectEvent({
            aspectType: "Conjunct",
            body1: "Sun",
            body2: "Moon",
            phase: "Forming",
          }),
        ],
      );

      expect(result).toStrictEqual([
        { aspect: "conjunct", bodies: ["sun", "moon"] },
      ]);
    });

    it("does not mutate the previous state array", () => {
      const afterForming = service.computeAspectBodies(
        [],
        [
          createAspectEvent({
            aspectType: "Conjunct",
            body1: "Sun",
            body2: "Moon",
            phase: "Forming",
          }),
        ],
      );

      service.computeAspectBodies(afterForming, [
        createAspectEvent({
          aspectType: "Conjunct",
          body1: "Sun",
          body2: "Moon",
          phase: "Dissolving",
        }),
      ]);

      expect(afterForming).toHaveLength(1);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detect", () => {
    it("emits a compound aspect once when detectors repeat it", () => {
      const minute = moment.utc("2026-10-20T12:00:00Z");
      const kite = (order: string[]): DetectedCalendarEvent => ({
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Quadruple Aspect",
          "Kite",
          "Forming",
          ...order,
          "Venus Focal",
        ],
        description: "Jupiter, Mars, Moon, Venus kite forming (Venus focal)",
        end: minute,
        start: minute,
        summary: `➡️ 🪁 ${order.join("-")} kite forming`,
      });
      const repeatingDetector = {
        detect: vi
          .fn<CompositeAspectDetector["detect"]>()
          .mockReturnValue([
            kite(["Moon", "Mars", "Jupiter", "Venus"]),
            kite(["Moon", "Jupiter", "Mars", "Venus"]),
          ]),
      };
      const delegatedService = new AspectsService(
        [],
        [repeatingDetector, repeatingDetector],
        [],
        new LoggerService(),
      );

      const { events } = delegatedService.detect({
        coordinateEphemerisByBody: {} as Record<Body, CoordinateEphemeris>,
        minute,
        previousAspectBodies: [],
      });

      expect(events).toStrictEqual([
        kite(["Moon", "Mars", "Jupiter", "Venus"]),
      ]);
    });

    it("combines detector outputs and progressive events", () => {
      const minute = moment.utc("2026-01-21T12:00:00Z");
      const simpleEvent = {
        categories: [
          "Astronomy",
          "Astrology",
          "Simple Aspect",
          "Major Aspect",
          "Sun",
          "Moon",
          "Conjunct",
          "Forming",
        ],
        description: "Sun forming conjunct Moon",
        end: minute,
        start: minute,
        summary: "Sun forming conjunct Moon",
      } satisfies DetectedCalendarEvent;
      const compositeEvent = {
        categories: ["Astronomy", "Astrology", "Composite"],
        description: "Composite",
        end: minute,
        start: minute,
        summary: "Composite",
      } satisfies DetectedCalendarEvent;
      const progressiveEvent = {
        categories: ["Astronomy", "Astrology", "Progressive"],
        description: "Progressive",
        end: minute,
        start: minute,
        summary: "Progressive",
      } satisfies DetectedCalendarEvent;

      const mockSimpleAspectDetector = {
        detect: vi
          .fn<SimpleAspectDetector["detect"]>()
          .mockReturnValue([simpleEvent]),
        detectActive: vi.fn<SimpleAspectDetector["detectActive"]>(),
      };
      const mockCompositeAspectDetector = {
        detect: vi
          .fn<CompositeAspectDetector["detect"]>()
          .mockReturnValue([compositeEvent]),
      };
      const mockProgressiveAspectDetector = {
        detectProgressive: vi
          .fn<ProgressiveAspectDetector["detectProgressive"]>()
          .mockReturnValue([progressiveEvent]),
      };
      const delegatedService = new AspectsService(
        [mockSimpleAspectDetector],
        [mockCompositeAspectDetector],
        [mockProgressiveAspectDetector],
        new LoggerService(),
      );
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;

      const detectResult = delegatedService.detect({
        coordinateEphemerisByBody,
        minute,
        previousAspectBodies: [],
      });

      expect(mockSimpleAspectDetector.detect).toHaveBeenCalledWith({
        coordinateEphemerisByBody,
        minute,
      });
      expect(mockCompositeAspectDetector.detect).toHaveBeenCalledWith({
        currentAspectBodies: [{ aspect: "conjunct", bodies: ["sun", "moon"] }],
        minute,
        previousAspectBodies: [],
      });
      expect(detectResult.events).toStrictEqual([simpleEvent, compositeEvent]);

      expect(delegatedService.detectProgressive([simpleEvent])).toStrictEqual([
        progressiveEvent,
      ]);
      expect(
        mockProgressiveAspectDetector.detectProgressive,
      ).toHaveBeenCalledWith([simpleEvent]);
    });
  });

  describe("seed", () => {
    it("returns every aspect already in orb and composes compounds from an empty past", () => {
      const minute = moment.utc("2026-10-01T04:00:00Z");
      const compositeEvent = {
        categories: ["Astronomy", "Astrology", "Compound Aspect", "Forming"],
        description: "T-Square",
        end: minute,
        start: minute,
        summary: "T-Square",
      } satisfies DetectedCalendarEvent;
      const majorActive = [
        { aspect: "opposite", bodies: ["mars", "pluto"] },
        { aspect: "square", bodies: ["mercury", "mars"] },
      ] satisfies AspectBodies[];
      const minorActive = [
        { aspect: "quincunx", bodies: ["sun", "neptune"] },
      ] satisfies AspectBodies[];
      const mockMajorDetector = {
        detect: vi.fn<SimpleAspectDetector["detect"]>(),
        detectActive: vi
          .fn<SimpleAspectDetector["detectActive"]>()
          .mockReturnValue(majorActive),
      };
      const mockMinorDetector = {
        detect: vi.fn<SimpleAspectDetector["detect"]>(),
        detectActive: vi
          .fn<SimpleAspectDetector["detectActive"]>()
          .mockReturnValue(minorActive),
      };
      const mockCompositeAspectDetector = {
        detect: vi
          .fn<CompositeAspectDetector["detect"]>()
          .mockReturnValue([compositeEvent]),
      };
      const seedingService = new AspectsService(
        [mockMajorDetector, mockMinorDetector],
        [mockCompositeAspectDetector],
        [],
        new LoggerService(),
      );
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;

      const seeded = seedingService.seed({ coordinateEphemerisByBody, minute });

      expect(mockMajorDetector.detectActive).toHaveBeenCalledWith({
        coordinateEphemerisByBody,
        minute,
      });
      expect(seeded.aspectBodies).toStrictEqual([
        ...majorActive,
        ...minorActive,
      ]);
      expect(mockCompositeAspectDetector.detect).toHaveBeenCalledWith({
        currentAspectBodies: [...majorActive, ...minorActive],
        minute,
        previousAspectBodies: [],
      });
      expect(seeded.events).toStrictEqual([compositeEvent]);
    });

    it("emits no simple-aspect events", () => {
      const minute = moment.utc("2026-10-01T04:00:00Z");
      const mockSimpleAspectDetector = {
        detect: vi.fn<SimpleAspectDetector["detect"]>(),
        detectActive: vi
          .fn<SimpleAspectDetector["detectActive"]>()
          .mockReturnValue([{ aspect: "trine", bodies: ["sun", "moon"] }]),
      };
      const seedingService = new AspectsService(
        [mockSimpleAspectDetector],
        [],
        [],
        new LoggerService(),
      );

      const seeded = seedingService.seed({
        coordinateEphemerisByBody: {} as Record<Body, CoordinateEphemeris>,
        minute,
      });

      expect(mockSimpleAspectDetector.detect).not.toHaveBeenCalled();
      expect(seeded.events).toStrictEqual([]);
    });
  });
});
