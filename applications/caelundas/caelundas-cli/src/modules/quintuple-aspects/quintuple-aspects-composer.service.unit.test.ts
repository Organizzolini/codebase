import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";
import { MathService } from "../math/math.service";

import { QuintupleAspectsComposerService } from "./quintuple-aspects-composer.service";

import type { Body } from "../caelundas/caelundas.types";

describe(QuintupleAspectsComposerService, () => {
  let service: QuintupleAspectsComposerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        QuintupleAspectsComposerService,
        {
          provide: CompoundPhaseService,
          useValue: createMock<CompoundPhaseService>(),
        },
        {
          provide: AspectPhaseEmojiService,
          useValue: createMock<AspectPhaseEmojiService>(),
        },
        {
          provide: ProgressiveCompoundEventService,
          useValue: createMock<ProgressiveCompoundEventService>(),
        },
        { provide: MathService, useValue: createMock<MathService>() },
      ],
    }).compile();

    service = await module.resolve(QuintupleAspectsComposerService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns null when pentagram event does not receive five bodies", () => {
    const event = service.buildPentagramEvent(
      ["sun", "moon", "mars", "jupiter"],
      "forming",
      moment.utc("2024-03-21T12:00:00.000Z"),
    );

    expect(event).toBeNull();
  });

  it("returns null when pentagram path has no starting body", () => {
    const orderedBodies = service.traversePentagramPath(
      new Map(),
      [] as Body[],
    );

    expect(orderedBodies).toBeNull();
  });

  it("returns null when pentagram path cannot find the next step", () => {
    const orderedBodies = service.traversePentagramPath(
      new Map([
        ["moon", new Set<Body>(["sun"])],
        ["sun", new Set<Body>(["moon"])],
      ]),
      ["sun", "moon", "mars", "jupiter", "venus"],
    );

    expect(orderedBodies).toBeNull();
  });

  it("returns null when the pentagram path does not close back to start", () => {
    const orderedBodies = service.traversePentagramPath(
      new Map<Body, Set<Body>>([
        ["jupiter", new Set<Body>(["moon", "venus"])],
        ["mars", new Set<Body>(["moon", "venus"])],
        ["moon", new Set<Body>(["jupiter", "venus"])],
        ["sun", new Set<Body>(["jupiter", "mars"])],
        ["venus", new Set<Body>(["mars", "moon"])],
      ]),
      ["sun", "moon", "mars", "jupiter", "venus"],
    );

    expect(orderedBodies).toBeNull();
  });

  it("returns null when traversal reaches a body without adjacency data", () => {
    const orderedBodies = service.traversePentagramPath(
      new Map<Body, Set<Body>>([
        ["jupiter", new Set<Body>(["moon", "venus"])],
        ["moon", new Set<Body>(["jupiter", "venus"])],
        ["sun", new Set<Body>(["jupiter", "mars"])],
        ["venus", new Set<Body>(["mars", "moon"])],
      ]),
      ["sun", "moon", "mars", "jupiter", "venus"],
    );

    expect(orderedBodies).toBeNull();
  });

  it("returns null when traversal encounters missing adjacency mid-path", () => {
    const orderedBodies = service.traversePentagramPath(
      new Map<Body, Set<Body>>([
        ["jupiter", new Set<Body>(["moon", "venus"])],
        ["sun", new Set<Body>(["jupiter", "mars"])],
        ["venus", new Set<Body>(["mars", "moon"])],
      ]),
      ["sun", "moon", "mars", "jupiter", "venus"],
    );

    expect(orderedBodies).toBeNull();
  });
});
