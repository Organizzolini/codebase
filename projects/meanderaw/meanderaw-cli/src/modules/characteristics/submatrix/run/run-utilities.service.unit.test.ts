import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { MatrixService } from "../../../matrix/matrix.service";

import { RunUtilitiesService } from "./run-utilities.service";

describe(RunUtilitiesService, () => {
  let matrixService: MatrixService;
  let service: RunUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [RunUtilitiesService],
    }).compile();

    matrixService = await module.resolve(MatrixService);
    service = await module.resolve(RunUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("longestHorizontalRunLength", () => {
    it("reports zero for an empty matrix", () => {
      expect(service.longestHorizontalRunLength([])).toBe(0);
    });

    it("caps a wrapped run at the column count", () => {
      const matrix = matrixService.fromCode({
        columns: 2,
        digits: "3333",
        repeats: 1,
        rows: 2,
      });

      expect(service.longestHorizontalRunLength(matrix)).toBe(2);
    });

    it("finds the longer of two rows", () => {
      const matrix = matrixService.fromCode({
        columns: 2,
        digits: "ecf0",
        repeats: 1,
        rows: 2,
      });

      expect(service.longestHorizontalRunLength(matrix)).toBe(1);
    });
  });

  describe("longestVerticalRunLength", () => {
    it("reports zero for an empty matrix", () => {
      expect(service.longestVerticalRunLength([])).toBe(0);
    });

    it("never wraps a run across the band's own border rules", () => {
      // A single-column south arm at row 0 and another at row 2, with a
      // bare row 1 between them. If the last row's south arm wrapped
      // around to row 0 the way an east arm wraps across columns, this
      // would read as one continuous run of 2; since it does not, the
      // longest run is the lone edge from row 0 to row 1.
      const matrix = matrixService.fromCode({
        columns: 1,
        digits: "404",
        repeats: 1,
        rows: 3,
      });

      expect(service.longestVerticalRunLength(matrix)).toBe(1);
    });

    it("finds the longer of two columns", () => {
      const matrix = matrixService.fromCode({
        columns: 2,
        digits: "ecf0",
        repeats: 1,
        rows: 2,
      });

      expect(service.longestVerticalRunLength(matrix)).toBe(2);
    });
  });
});
