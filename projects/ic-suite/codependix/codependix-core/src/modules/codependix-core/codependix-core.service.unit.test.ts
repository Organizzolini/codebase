import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodependixCoreService } from "./codependix-core.service";

describe(CodependixCoreService, () => {
  let service: CodependixCoreService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CodependixCoreService],
    }).compile();

    service = await module.resolve(CodependixCoreService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
