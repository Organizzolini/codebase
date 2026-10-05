import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CompoundPhaseService } from "./compound-phase.service";

describe(CompoundPhaseService, () => {
  let service: CompoundPhaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CompoundPhaseService],
    }).compile();

    service = await module.resolve(CompoundPhaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
