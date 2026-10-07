import { Test } from "@nestjs/testing";
import { getDataSourceToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it } from "vitest";

import { CaelundasDatabaseService } from "./caelundas-database.service";

describe(CaelundasDatabaseService, () => {
  const dataSource = { isInitialized: true };
  let service: CaelundasDatabaseService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CaelundasDatabaseService,
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = await module.resolve(CaelundasDatabaseService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reports an initialized data source as connected", () => {
    dataSource.isInitialized = true;

    expect(service.isConnected()).toBe(true);
  });

  it("reports an uninitialized data source as disconnected", () => {
    dataSource.isInitialized = false;

    expect(service.isConnected()).toBe(false);
  });
});
