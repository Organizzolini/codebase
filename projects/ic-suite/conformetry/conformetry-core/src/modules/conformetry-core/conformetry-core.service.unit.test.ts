import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ConformetryCoreService } from "./conformetry-core.service";

describe(ConformetryCoreService, () => {
  let service: ConformetryCoreService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConformetryCoreService],
    }).compile();

    service = await module.resolve(ConformetryCoreService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
