import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LexicoDatabaseService } from "./lexico-database.service";

describe(LexicoDatabaseService, () => {
  let service: LexicoDatabaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LexicoDatabaseService],
    }).compile();

    service = await module.resolve(LexicoDatabaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
