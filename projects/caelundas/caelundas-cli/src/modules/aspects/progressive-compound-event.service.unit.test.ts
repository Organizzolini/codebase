import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ProgressiveCompoundEventService } from "./progressive-compound-event.service";

describe(ProgressiveCompoundEventService, () => {
  let service: ProgressiveCompoundEventService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ProgressiveCompoundEventService],
    }).compile();

    service = await module.resolve(ProgressiveCompoundEventService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
