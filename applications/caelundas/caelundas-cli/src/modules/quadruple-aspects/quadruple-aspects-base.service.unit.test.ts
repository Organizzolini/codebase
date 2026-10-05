import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";

import { QuadrupleAspectsBaseService } from "./quadruple-aspects-base.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";

describe(QuadrupleAspectsBaseService, () => {
  let service: QuadrupleAspectsBaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        QuadrupleAspectsBaseService,
        AspectGraphService,
        AspectPhaseEmojiService,
      ],
    }).compile();

    service = await module.resolve(QuadrupleAspectsBaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns false when opposite body is missing while verifying grand-cross squares", () => {
    const result = service.verifyGrandCrossSquares(
      ["sun", "moon", "mars"],
      new Map<Body, Body>([
        ["moon", "sun"],
        ["sun", "moon"],
      ]),
      [
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ],
    );

    expect(result).toBe(false);
  });

  it("returns false when opposite body map contains a null value", () => {
    const oppositeBodyMap = new Map<Body, Body>([
      ["mars", null as unknown as Body],
      ["moon", "sun"],
      ["sun", "moon"],
    ]);

    const result = service.verifyGrandCrossSquares(
      ["sun", "moon", "mars", "jupiter"],
      oppositeBodyMap,
      [],
    );

    expect(result).toBe(false);
  });

  it("returns false when one required square aspect is missing", () => {
    const bodyList = ["sun", "moon", "mars", "jupiter"] as const;
    const oppositeBodyMap = new Map<Body, Body>([
      ["jupiter", "mars"],
      ["mars", "jupiter"],
      ["moon", "sun"],
      ["sun", "moon"],
    ]);
    const squareEdges: AspectBodies[] = [
      { aspect: "square", bodies: ["sun", "mars"] },
      { aspect: "square", bodies: ["moon", "jupiter"] },
    ];

    const result = service.verifyGrandCrossSquares(
      [...bodyList],
      oppositeBodyMap,
      squareEdges,
    );

    expect(result).toBe(false);
  });

  it("returns true when all grand-cross square requirements are present", () => {
    const result = service.verifyGrandCrossSquares(
      ["sun", "moon", "mars", "jupiter"],
      new Map<Body, Body>([
        ["jupiter", "mars"],
        ["mars", "jupiter"],
        ["moon", "sun"],
        ["sun", "moon"],
      ]),
      [
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["moon", "mars"] },
        { aspect: "square", bodies: ["moon", "jupiter"] },
      ],
    );

    expect(result).toBe(true);
  });

  it("returns true for an empty body list", () => {
    const result = service.verifyGrandCrossSquares(
      [],
      new Map<Body, Body>(),
      [],
    );

    expect(result).toBe(true);
  });

  it("builds progressive events by stripping phase markers and emojis", () => {
    const formingEvent: Event = {
      categories: ["Quadruple Aspect", "Grand Cross", "Forming", "Sun"],
      description: "Mars, Moon, Sun, Venus grand cross forming (Mars focal)",
      end: moment.utc("2024-03-21T10:00:00.000Z"),
      start: moment.utc("2024-03-21T10:00:00.000Z"),
      summary: "➡️ ⊞ ☉-☽-♂-♀ Mars, Moon, Sun, Venus grand cross forming",
    };
    const dissolvingEvent: Event = {
      categories: ["Quadruple Aspect", "Grand Cross", "Dissolving", "Sun"],
      description: "Mars, Moon, Sun, Venus grand cross dissolving (Mars focal)",
      end: moment.utc("2024-03-21T14:00:00.000Z"),
      start: moment.utc("2024-03-21T14:00:00.000Z"),
      summary: "⬅️ ⊞ ☉-☽-♂-♀ Mars, Moon, Sun, Venus grand cross dissolving",
    };

    const progressiveEvent = service.buildProgressiveEvent(
      formingEvent,
      dissolvingEvent,
    );

    expect(progressiveEvent.categories).not.toContain("Forming");
    expect(progressiveEvent.description).toBe(
      "Mars, Moon, Sun, Venus grand cross",
    );
    expect(progressiveEvent.summary).toBe(
      "⊞ ☉-☽-♂-♀ Mars, Moon, Sun, Venus grand cross forming",
    );
  });

  it("builds quadruple-aspect descriptions with and without focal body", () => {
    expect(
      service.buildQuadrupleAspectDescription({
        bodiesSorted: ["Mars", "Moon", "Sun", "Venus"],
        phase: "forming",
        quadrupleAspect: "grand cross",
      }),
    ).toBe("Mars, Moon, Sun, Venus grand cross forming");

    expect(
      service.buildQuadrupleAspectDescription({
        bodiesSorted: ["Mars", "Moon", "Sun", "Venus"],
        focalOrApexBody: "venus",
        phase: "dissolving",
        quadrupleAspect: "kite",
      }),
    ).toBe("Mars, Moon, Sun, Venus kite dissolving (Venus focal)");
  });
});
