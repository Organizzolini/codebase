import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";

import { SextupleAspectsComposerService } from "./sextuple-aspects-composer.service";

import type { Body } from "../caelundas/caelundas.types";

describe(SextupleAspectsComposerService, () => {
  let service: SextupleAspectsComposerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AspectPhaseEmojiService,
        ProgressiveCompoundEventService,
        SextupleAspectsComposerService,
      ],
    }).compile();

    service = await module.resolve(SextupleAspectsComposerService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns false for hexagon sextiles when a sparse arrangement has missing bodies", () => {
    const sparseArrangement = [
      "sun",
      "moon",
      "mars",
      undefined,
      "venus",
      "jupiter",
    ] as unknown as Body[];

    const result = service.checkHexagonSextiles(sparseArrangement, new Map());

    expect(result).toBe(false);
  });

  it("returns null when a generated arrangement omits a body", () => {
    const result = service.tryArrangementForPair({
      index: 0,
      index_: 0,
      index__: 1,
      l: 1,
      sextileConnections: new Map(),
      trine1: ["sun", "moon"] as unknown as Body[],
      trine2: ["mars", "venus", "jupiter"],
    });

    expect(result).toBeNull();
  });

  it("returns false when next body is missing in a six-body arrangement", () => {
    const arrangementWithMissingNext = [
      "sun",
      "moon",
      "mars",
      "venus",
      "jupiter",
      undefined,
    ] as unknown as Body[];

    const result = service.checkHexagonSextiles(
      arrangementWithMissingNext,
      new Map(),
    );

    expect(result).toBe(false);
  });

  it("returns null when index resolution cannot determine remaining positions", () => {
    const findSpy = vi
      .spyOn(Array.prototype, "find")
      .mockReturnValueOnce(undefined);

    const result = service.tryArrangementForPair({
      index: 0,
      index_: 1,
      index__: 2,
      l: 0,
      sextileConnections: new Map(),
      trine1: ["sun", "moon", "mars"],
      trine2: ["venus", "jupiter", "saturn"],
    });

    expect(result).toBeNull();

    findSpy.mockRestore();
  });
});
