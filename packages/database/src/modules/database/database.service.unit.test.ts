import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DatabaseService } from "./database.service";

describe(DatabaseService, () => {
  let service: DatabaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = await module.resolve(DatabaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
