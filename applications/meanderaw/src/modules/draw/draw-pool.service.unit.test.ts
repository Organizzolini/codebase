import { createMock } from "@golevelup/ts-vitest";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { TileEnumerationService } from "../enumeration/tile-enumeration.service";

import { DrawPoolService } from "./draw-pool.service";
import { DrawWorkerService } from "./draw-worker.service";

import type { MeanderRecord } from "../database/database.types";

describe(DrawPoolService, () => {
  let service: DrawPoolService;
  let drawWorkerService: DrawWorkerService;
  let tileEnumerationService: TileEnumerationService;

  const shape = { columns: 2, rows: 3 };
  const first = createMock<MeanderRecord>({ code: "first" });
  const second = createMock<MeanderRecord>({ code: "second" });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawPoolService,
        { provide: ConfigService, useValue: { get: () => 0 } },
        {
          provide: DrawWorkerService,
          useValue: createMock<DrawWorkerService>(),
        },
        {
          provide: TileEnumerationService,
          useValue: createMock<TileEnumerationService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawPoolService);
    drawWorkerService = await module.resolve(DrawWorkerService);
    tileEnumerationService = await module.resolve(TileEnumerationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("records", () => {
    it("draws a shape's orbit minima in-process when configured with no workers", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1, 2]);
      vi.mocked(drawWorkerService.records).mockReturnValue([]);

      await service.records(shape);

      expect(tileEnumerationService.orbitMinima).toHaveBeenCalledWith(3, 2);
      expect(drawWorkerService.records).toHaveBeenCalledWith(shape, [1, 2]);
    });

    it("orders a shape's rows by their representatives' edge keys, whatever order they were drawn in", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1, 2]);
      vi.mocked(drawWorkerService.records).mockReturnValue([
        { key: "10", record: second },
        { key: "01", record: first },
      ]);

      await expect(service.records(shape)).resolves.toStrictEqual([
        first,
        second,
      ]);
    });
  });
});
