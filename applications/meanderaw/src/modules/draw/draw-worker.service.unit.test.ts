import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildTile } from "../../../testing/tiles";
import { CodeService } from "../code/code.service";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";
import { SymmetryService } from "../symmetry/symmetry.service";

import { DrawRecordService } from "./draw-record.service";
import { DrawWorkerService } from "./draw-worker.service";

import type { MeanderRecord } from "../database/database.types";

describe(DrawWorkerService, () => {
  let service: DrawWorkerService;
  let codeService: CodeService;
  let drawRecordService: DrawRecordService;
  let symmetryService: SymmetryService;
  let tileEnumerationService: TileEnumerationService;

  const shape = { columns: 1, rows: 3 };
  const tile = buildTile(["s", ".", "."]);
  const representative = buildTile([".", "s", "."]);
  const record = createMock<MeanderRecord>({ code: "01x03y048" });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawWorkerService,
        { provide: CodeService, useValue: createMock<CodeService>() },
        {
          provide: DrawRecordService,
          useValue: createMock<DrawRecordService>(),
        },
        { provide: SymmetryService, useValue: createMock<SymmetryService>() },
        {
          provide: TileEnumerationService,
          useValue: createMock<TileEnumerationService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawWorkerService);
    codeService = await module.resolve(CodeService);
    drawRecordService = await module.resolve(DrawRecordService);
    symmetryService = await module.resolve(SymmetryService);
    tileEnumerationService = await module.resolve(TileEnumerationService);
  });

  beforeEach(() => {
    vi.mocked(tileEnumerationService.tile).mockReturnValue(tile);
    vi.mocked(symmetryService.canonicalTile).mockReturnValue(representative);
    vi.mocked(codeService.spell).mockReturnValue("01x03y048");
    vi.mocked(drawRecordService.record).mockReturnValue(record);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("records", () => {
    it("draws each mask's class representative, recorded as enumerated rather than hardcoded", () => {
      service.records(shape, [2]);

      expect(tileEnumerationService.tile).toHaveBeenCalledWith(shape, 2);
      expect(symmetryService.canonicalTile).toHaveBeenCalledWith(tile);
      expect(codeService.spell).toHaveBeenCalledWith(representative);
      expect(drawRecordService.record).toHaveBeenCalledWith(
        "01x03y048",
        shape,
        false,
      );
    });

    it("records one row per mask, in mask order", () => {
      expect(service.records(shape, [2, 4])).toStrictEqual([record, record]);
    });
  });
});
