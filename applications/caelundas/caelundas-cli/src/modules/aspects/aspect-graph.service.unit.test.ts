import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectGraphService } from "./aspect-graph.service";

describe(AspectGraphService, () => {
  let service: AspectGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectGraphService],
    }).compile();

    service = await module.resolve(AspectGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
