import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { LongestVerticalRunLengthCharacteristicService } from "./longest-vertical-run-length-characteristic.service";
import { RunUtilitiesService } from "./run-utilities.service";

describe(LongestVerticalRunLengthCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: LongestVerticalRunLengthCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        LongestVerticalRunLengthCharacteristicService,
        RunUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      LongestVerticalRunLengthCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    { code: { columns: 1, digits: "", repeats: 1, rows: 0 }, expected: 0 },
    { code: { columns: 2, digits: "ecf0", repeats: 1, rows: 2 }, expected: 2 },
    { code: { columns: 2, digits: "21", repeats: 1, rows: 1 }, expected: 0 },
    { code: { columns: 2, digits: "4488", repeats: 1, rows: 2 }, expected: 1 },
    { code: { columns: 2, digits: "40a1", repeats: 1, rows: 2 }, expected: 1 },
    { code: { columns: 1, digits: "7", repeats: 1, rows: 1 }, expected: 1 },
  ])("computes $expected for $code.digits", ({ code, expected }) => {
    expect(service.compute(contextService.create(code))).toBe(expected);
  });

  it("never wraps a vertical run across the band's own border rules", () => {
    // A single-column south arm at row 0 and another at row 2, with a bare
    // row 1 between them. If the last row's south arm wrapped around to
    // row 0 the way an east arm wraps across columns, this would read as
    // one continuous run of 2; since it does not, the longest run is the
    // lone edge from row 0 to row 1.
    const context = contextService.create({
      columns: 1,
      digits: "404",
      repeats: 1,
      rows: 3,
    });

    expect(service.compute(context)).toBe(1);
  });
});
