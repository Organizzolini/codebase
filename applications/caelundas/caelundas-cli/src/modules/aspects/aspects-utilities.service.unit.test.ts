import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MathService } from "../math/math.service";

import { AspectsUtilitiesService } from "./aspects-utilities.service";

describe(AspectsUtilitiesService, () => {
  let service: AspectsUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectsUtilitiesService, MathService],
    }).compile();

    service = await module.resolve(AspectsUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
