import { createMock } from "@golevelup/ts-vitest";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { TileEnumerationService } from "../enumeration/tile-enumeration.service";

import { DrawPoolService } from "./draw-pool.service";
import { DrawWorkerService } from "./draw-worker.service";
import { DRAW_POOL_BATCH_SIZE } from "./draw.constants";

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

  describe("batches", () => {
    /** Reads every batch a shape's draw hands back. */
    const drawn = async (): Promise<(readonly MeanderRecord[])[]> => {
      const batches: (readonly MeanderRecord[])[] = [];

      for await (const batch of service.batches(shape)) {
        batches.push(batch);
      }

      return batches;
    };

    it("draws a shape's orbit minima in-process when configured with no workers", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue([1, 2]);
      vi.mocked(drawWorkerService.records).mockReturnValue([first]);

      await expect(drawn()).resolves.toStrictEqual([[first]]);
      expect(tileEnumerationService.orbitMinima).toHaveBeenCalledWith(3, 2);
      expect(drawWorkerService.records).toHaveBeenCalledWith(shape, [1, 2]);
    });

    it("hands a shape back a batch at a time, never more than one batch's worth of minima per draw", async () => {
      vi.mocked(tileEnumerationService.orbitMinima).mockReturnValue(
        Array.from(
          { length: DRAW_POOL_BATCH_SIZE + 1 },
          (_mask, index) => index,
        ),
      );
      vi.mocked(drawWorkerService.records)
        .mockReturnValueOnce([first])
        .mockReturnValueOnce([second]);

      await expect(drawn()).resolves.toStrictEqual([[first], [second]]);
      expect(drawWorkerService.records).toHaveBeenLastCalledWith(shape, [
        DRAW_POOL_BATCH_SIZE,
      ]);
    });
  });
});
