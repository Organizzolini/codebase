import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { LongestHorizontalRunLengthCharacteristicService } from "./longest-horizontal-run-length-characteristic.service";
import { RunUtilitiesService } from "./run-utilities.service";

describe(LongestHorizontalRunLengthCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: LongestHorizontalRunLengthCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        LongestHorizontalRunLengthCharacteristicService,
        RunUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      LongestHorizontalRunLengthCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: { columns: 1, digits: "", repeats: 1, rows: 0 }, expected: 0 },
    { code: { columns: 2, digits: "ecf0", repeats: 1, rows: 2 }, expected: 1 },
    { code: { columns: 2, digits: "21", repeats: 1, rows: 1 }, expected: 1 },
    { code: { columns: 2, digits: "4080", repeats: 1, rows: 2 }, expected: 0 },
    { code: { columns: 2, digits: "40a1", repeats: 1, rows: 2 }, expected: 1 },
    { code: { columns: 1, digits: "7", repeats: 1, rows: 1 }, expected: 1 },
  ])("computes $expected for $code.digits", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });

  it("caps a wrapped run at the column count", () => {
    // A 2-column digit that repeats identically in both columns reduces to
    // its 3-row, 1-column repeating unit before this runs, so the single
    // remaining column runs east all the way around it — the wrap would
    // otherwise double-count past columns.
    const context = contextService.create({
      columns: 2,
      digits: "333300",
      repeats: 1,
      rows: 3,
    });

    expect(service.compute(context)).toBe(1);
  });
});
