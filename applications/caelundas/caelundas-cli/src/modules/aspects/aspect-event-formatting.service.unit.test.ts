import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectEventFormattingService } from "./aspect-event-formatting.service";

describe(AspectEventFormattingService, () => {
  let service: AspectEventFormattingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectEventFormattingService],
    }).compile();

    service = await module.resolve(AspectEventFormattingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
