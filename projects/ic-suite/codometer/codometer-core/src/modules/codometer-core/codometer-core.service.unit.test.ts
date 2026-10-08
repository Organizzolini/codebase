import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodometerCoreService } from "./codometer-core.service";

describe(CodometerCoreService, () => {
  let service: CodometerCoreService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CodometerCoreService],
    }).compile();

    service = await module.resolve(CodometerCoreService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
