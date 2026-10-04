import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { HealthService } from "./health.service";

describe(HealthService, () => {
  let service: HealthService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = await module.resolve(HealthService);
  });

  it("is defined", () => {
    expect.hasAssertions();

    expect(service).toBeDefined();
  });

  it("returns true for isHealthy", () => {
    expect.hasAssertions();

    const service = new HealthService();

    expect(service.isHealthy()).toBe(true);
  });
});
