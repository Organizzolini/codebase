import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DatabaseService } from "../database/database.service";
import { EnumerationService } from "../enumeration/enumeration.service";

import { DrawEnumerationService } from "./draw-enumeration.service";
import { DrawPoolService } from "./draw-pool.service";

import type { MeanderRecord } from "../database/database.types";

// 🧪 Tests

/**
 * What this service does with the enumeration rather than what the
 * enumeration finds: which shapes it walks, that it marks no row hardcoded, and
 * that a shape's rows reach the database a shape at a time. What the rows
 * actually hold is asserted against a real connection in
 * `draw-enumeration.service.integration.test.ts`.
 */
describe(DrawEnumerationService, () => {
  let drawPoolService: DrawPoolService;
  let databaseService: DatabaseService;
  let enumerationService: EnumerationService;
  let service: DrawEnumerationService;

  const record = createMock<MeanderRecord>({ code: "00" });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawEnumerationService,
        {
          provide: DrawPoolService,
          useValue: createMock<DrawPoolService>(),
        },
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: EnumerationService,
          useValue: createMock<EnumerationService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawEnumerationService);
    drawPoolService = await module.resolve(DrawPoolService);
    databaseService = await module.resolve(DatabaseService);
    enumerationService = await module.resolve(EnumerationService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enumerationService.shapes).mockReturnValue([
      { columns: 1, rows: 3 },
      { columns: 2, rows: 3 },
    ]);
    vi.mocked(drawPoolService.records).mockResolvedValue([record]);
    vi.mocked(databaseService.codes).mockResolvedValue(new Set());
    vi.mocked(databaseService.saveAll).mockResolvedValue(1);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("persist", () => {
    it("writes one shape's rows at a time rather than the whole draw run at once", async () => {
      await service.persist([
        { columns: 1, rows: 3 },
        { columns: 2, rows: 3 },
      ]);

      expect(databaseService.saveAll).toHaveBeenCalledTimes(2);
    });

    it("answers with how many rows were written", async () => {
      await expect(service.persist([{ columns: 1, rows: 3 }])).resolves.toBe(1);
    });

    it("skips a meander whose Code a row of its shape already holds, so a hardcoded row wins", async () => {
      const other = createMock<MeanderRecord>({ code: "01" });

      vi.mocked(drawPoolService.records).mockResolvedValue([record, other]);
      vi.mocked(databaseService.codes).mockResolvedValue(new Set(["00"]));

      await service.persist([{ columns: 1, rows: 3 }]);

      expect(databaseService.codes).toHaveBeenCalledWith({
        columns: 1,
        rows: 3,
      });
      expect(databaseService.saveAll).toHaveBeenCalledWith([other]);
    });

    it("writes the rows the pool draws for each shape", async () => {
      await service.persist([{ columns: 1, rows: 3 }]);

      expect(drawPoolService.records).toHaveBeenCalledWith({
        columns: 1,
        rows: 3,
      });
      expect(databaseService.saveAll).toHaveBeenCalledWith([record]);
    });

    it("ends the pool's threads once the draw run is written, or fails", async () => {
      vi.mocked(databaseService.saveAll).mockRejectedValueOnce(
        new Error("UNIQUE constraint failed"),
      );

      await expect(service.persist([{ columns: 1, rows: 3 }])).rejects.toThrow(
        /UNIQUE/u,
      );
      expect(drawPoolService.close).toHaveBeenCalledExactlyOnceWith();
    });
  });

  describe("drawAll", () => {
    it("walks every shape the budget admits, rather than a range of its own", async () => {
      await service.drawAll();

      expect(vi.mocked(drawPoolService.records).mock.calls).toStrictEqual([
        [{ columns: 1, rows: 3 }],
        [{ columns: 2, rows: 3 }],
      ]);
    });
  });
});
