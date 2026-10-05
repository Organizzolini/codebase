import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectPhaseEmojiService } from "./aspect-phase-emoji.service";

describe(AspectPhaseEmojiService, () => {
  let service: AspectPhaseEmojiService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectPhaseEmojiService],
    }).compile();

    service = await module.resolve(AspectPhaseEmojiService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
