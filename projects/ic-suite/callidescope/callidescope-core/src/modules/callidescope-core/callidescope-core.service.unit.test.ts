import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CallidescopeCoreService } from "./callidescope-core.service";

describe(CallidescopeCoreService, () => {
  let service: CallidescopeCoreService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CallidescopeCoreService],
    }).compile();

    service = await module.resolve(CallidescopeCoreService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
