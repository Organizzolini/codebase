import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { AspectCalculationSupportService } from "./aspect-calculation-support.service";

describe(AspectCalculationSupportService, () => {
  let service: AspectCalculationSupportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectCalculationSupportService],
    }).compile();

    service = await module.resolve(AspectCalculationSupportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
