import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  BOOLEAN_CHARACTERISTIC_KEYS,
  CHARACTERISTIC_KEYS,
  LETTER_CHARACTERISTIC_KEYS,
  NUMERIC_CHARACTERISTIC_KEYS,
} from "../characteristics/characteristics.constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CharacteristicsService } from "../characteristics/characteristics.service";
import { CodeModule } from "../code/code.module";
import { CodeService } from "../code/code.service";
import { DrawingModule } from "../drawing/drawing.module";

import { DrawRecordService } from "./draw-record.service";

// 🧪 Tests

/**
 * Drives the record builder through the real pipeline rather than through
 * mocks of it, because a row is the whole of what this produces and a
 * mocked collaborator would only assert that this service forwards calls.
 */
describe(DrawRecordService, () => {
  let service: DrawRecordService;
  let codeService: CodeService;
  let characteristicsService: CharacteristicsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule, CodeModule, DrawingModule],
      providers: [DrawRecordService],
    }).compile();

    service = await module.resolve(DrawRecordService);
    codeService = module.get(CodeService);
    characteristicsService = module.get(CharacteristicsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("record", () => {
    it("derives every field of a row from the Code alone", () => {
      const record = service.record("4488", { columns: 2, rows: 2 }, false);

      expect(record).toMatchObject({
        characteristics: {
          bettiNumber0Count: 1,
          density: 1,
          edgeCount: 1,
          endsAreLatticeNeighbors: true,
          endsOnBorderRules: true,
          freeEndCount: 2,
          inkPointCount: 2,
          isBars: true,
          isReducible: true,
          isSingleArc: true,
          longestVerticalRunLength: 1,
        },
        code: "02x02y4488",
        columns: 2,
        isHardcoded: false,
        lattice: "4488",
        repeats: 1,
        rows: 2,
      });
      expect(record.characteristics).not.toHaveProperty("crossCount");
      expect(record.characteristics).not.toHaveProperty("isDots");
      expect(record).not.toHaveProperty("pitch");
      expect(CHARACTERISTIC_KEYS.filter((key) => key in record)).toStrictEqual(
        [],
      );
    });

    it("stores every characteristic of the computed record in the map, a missing key reading as zero or false", () => {
      const code = "2335635cc29ca339";
      const record = service.record(code, { columns: 4, rows: 4 }, true);
      const canonical = codeService.parse(record.code);
      const expected = characteristicsService.compute(canonical);

      expect(
        NUMERIC_CHARACTERISTIC_KEYS.map((key) => [
          key,
          record.characteristics[key] ?? 0,
        ]),
      ).toStrictEqual(
        NUMERIC_CHARACTERISTIC_KEYS.map((key) => [key, expected[key]]),
      );
      expect(
        BOOLEAN_CHARACTERISTIC_KEYS.map((key) => [
          key,
          record.characteristics[key] === true,
        ]),
      ).toStrictEqual(
        BOOLEAN_CHARACTERISTIC_KEYS.map((key) => [key, expected[key]]),
      );
      expect(record.characteristics.isReducible === true).toBe(
        characteristicsService.isReducible(canonical),
      );
    });

    it("stores no zero in the map, so every letter it lacks is left out", () => {
      const record = service.record("03x03y650ed0880");

      expect(record.characteristics.aSoutheastLatinCount).toBe(1);
      expect(
        Object.values(record.characteristics).filter((value) => value === 0),
      ).toStrictEqual([]);
      expect(
        LETTER_CHARACTERISTIC_KEYS.filter(
          (key) => key in record.characteristics,
        ).length,
      ).toBeLessThan(LETTER_CHARACTERISTIC_KEYS.length);
    });

    it("records the pattern characteristics a Code's structure earns", () => {
      const record = service.record(
        "2335635cc29ca339",
        { columns: 4, rows: 4 },
        true,
      );

      expect(record.characteristics.isBoxes).toBe(true);
      expect(record.characteristics).not.toHaveProperty("crossCount");
      expect(record.characteristics).not.toHaveProperty("forkCount");

      const waterfallRecord = service.record(
        "255aa1",
        { columns: 2, rows: 3 },
        true,
      );

      expect(waterfallRecord.characteristics.isWaterfalls).toBe(true);

      const wideWaterfallRecord = service.record(
        "23531a",
        { columns: 3, rows: 2 },
        true,
      );

      expect(wideWaterfallRecord.characteristics.isWaterfalls).toBe(true);
    });

    it("records whether it is hardcoded as it was told rather than deriving it, since where a Code came from is no property of the Code", () => {
      expect(
        service.record("00", { columns: 1, rows: 2 }, true).isHardcoded,
      ).toBe(true);
      expect(
        service.record("00", { columns: 1, rows: 2 }, false).isHardcoded,
      ).toBe(false);
    });

    it("refuses a Code whose length disagrees with the shape it was named at", () => {
      expect(() =>
        service.record("00", { columns: 2, rows: 2 }, false),
      ).toThrow(/need 4/u);
    });
  });
});
