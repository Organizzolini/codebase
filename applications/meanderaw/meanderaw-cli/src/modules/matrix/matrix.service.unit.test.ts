import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { BARE_MATRIX_POINT } from "./matrix.constants";
import { MatrixService } from "./matrix.service";

import type { Submatrix } from "./matrix.types";

describe(MatrixService, () => {
  let service: MatrixService;
  let codeService: CodeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CodeService, MatrixService, SymmetryService, TileService],
    }).compile();

    service = await module.resolve(MatrixService);
    codeService = await module.resolve(CodeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();

    const submatrix: Submatrix = {
      column: 0,
      height: 1,
      matrix: [[BARE_MATRIX_POINT]],
      row: 0,
      width: 1,
    };

    expect(submatrix).toBeDefined();
  });

  describe("fromCode and toCode", () => {
    it("converts a formatted code string into a 2D matrix", () => {
      const matrix = service.fromCode("02x02y36c9");

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[0]?.[0]).toStrictEqual({
        east: true,
        north: false,
        south: false,
        west: true,
      });
      expect(matrix[0]?.[1]).toStrictEqual({
        east: true,
        north: false,
        south: true,
        west: false,
      });
      expect(matrix[1]?.[0]).toStrictEqual({
        east: false,
        north: true,
        south: true,
        west: false,
      });
      expect(matrix[1]?.[1]).toStrictEqual({
        east: false,
        north: true,
        south: false,
        west: true,
      });
    });

    it("converts a CodeObject object directly into a 2D matrix", () => {
      const parsed = codeService.parse("02x02y36c9");
      const matrix = service.fromCode(parsed);

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[0]?.[0]).toStrictEqual({
        east: true,
        north: false,
        south: false,
        west: true,
      });
    });

    it("converts bare hexadecimal digits with dimensions into a 2D matrix", () => {
      const matrix = service.fromCode("36c9", 2, 2);

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toHaveLength(2);
      expect(matrix[1]?.[1]).toStrictEqual({
        east: false,
        north: true,
        south: false,
        west: true,
      });
    });

    it("encodes a 2D matrix back to a formatted code string", () => {
      const matrix = service.fromCode("02x02y36c9");
      const code = service.toCode(matrix);

      expect(code).toBe("02x02y36c9");
    });

    it("encodes a 2D matrix with repeats", () => {
      const matrix = service.fromCode("02x02y36c9");
      const code = service.toCode(matrix, 2);

      expect(code).toBe("02x02y36c9r02");
    });

    it("handles empty matrix in toCode", () => {
      expect(service.toCode([])).toBe("00x00y");
    });

    it("handles matrix with zero columns in toCode", () => {
      expect(service.toCode([[]])).toBe("00x00y");
    });

    it("preserves matrix structure through round-trip conversions", () => {
      const originalCode = "02x02y36c9";
      const matrix = service.fromCode(originalCode);
      const encodedCode = service.toCode(matrix);
      const roundTrippedMatrix = service.fromCode(encodedCode);

      expect(encodedCode).toBe(originalCode);
      expect(roundTrippedMatrix).toStrictEqual(matrix);
    });
  });

  describe("pointAt", () => {
    it("returns the point at exact coordinates", () => {
      const matrix = service.fromCode("02x02y36c9");

      expect(service.pointAt(matrix, 0, 0)).toStrictEqual({
        east: true,
        north: false,
        south: false,
        west: true,
      });
      expect(service.pointAt(matrix, 1, 1)).toStrictEqual({
        east: false,
        north: true,
        south: false,
        west: true,
      });
    });

    it("wraps positive column indices cyclically", () => {
      const matrix = service.fromCode("02x02y36c9");

      expect(service.pointAt(matrix, 0, 2)).toStrictEqual(
        service.pointAt(matrix, 0, 0),
      );
      expect(service.pointAt(matrix, 0, 3)).toStrictEqual(
        service.pointAt(matrix, 0, 1),
      );
      expect(service.pointAt(matrix, 1, 4)).toStrictEqual(
        service.pointAt(matrix, 1, 0),
      );
    });

    it("wraps negative column indices cyclically", () => {
      const matrix = service.fromCode("02x02y36c9");

      expect(service.pointAt(matrix, 0, -1)).toStrictEqual(
        service.pointAt(matrix, 0, 1),
      );
      expect(service.pointAt(matrix, 0, -2)).toStrictEqual(
        service.pointAt(matrix, 0, 0),
      );
      expect(service.pointAt(matrix, 1, -3)).toStrictEqual(
        service.pointAt(matrix, 1, 1),
      );
    });

    it("returns BARE_MATRIX_POINT when row index is out of bounds", () => {
      const matrix = service.fromCode("02x02y36c9");

      expect(service.pointAt(matrix, -1, 0)).toStrictEqual(BARE_MATRIX_POINT);
      expect(service.pointAt(matrix, 2, 0)).toStrictEqual(BARE_MATRIX_POINT);
      expect(service.pointAt(matrix, 10, 0)).toStrictEqual(BARE_MATRIX_POINT);
    });

    it("returns BARE_MATRIX_POINT for empty matrix", () => {
      expect(service.pointAt([], 0, 0)).toStrictEqual(BARE_MATRIX_POINT);
      expect(service.pointAt([[]], 0, 0)).toStrictEqual(BARE_MATRIX_POINT);
      expect(service.pointAt([[undefined as never]], 0, 0)).toStrictEqual(
        BARE_MATRIX_POINT,
      );
    });
  });

  describe("rotate", () => {
    it("returns identical columns when rotating by 0", () => {
      const matrix = service.fromCode("02x02y36c9");
      const rotated = service.rotate(matrix, 0);

      expect(rotated).toStrictEqual(matrix);
    });

    it("rotates columns westward by step", () => {
      const matrix = service.fromCode("02x02y36c9");
      const rotated = service.rotate(matrix, 1);

      expect(rotated[0]?.[0]).toStrictEqual(matrix[0]?.[1]);
      expect(rotated[0]?.[1]).toStrictEqual(matrix[0]?.[0]);
      expect(rotated[1]?.[0]).toStrictEqual(matrix[1]?.[1]);
      expect(rotated[1]?.[1]).toStrictEqual(matrix[1]?.[0]);
    });

    it("wraps rotation steps larger than column count", () => {
      const matrix = service.fromCode("02x02y36c9");
      const rotatedOnce = service.rotate(matrix, 1);
      const rotatedThrice = service.rotate(matrix, 3);

      expect(rotatedThrice).toStrictEqual(rotatedOnce);
    });

    it("handles negative rotation steps", () => {
      const matrix = service.fromCode("02x02y36c9");
      const rotatedNegative = service.rotate(matrix, -1);
      const rotatedPositive = service.rotate(matrix, 1);

      expect(rotatedNegative).toStrictEqual(rotatedPositive);
    });

    it("handles empty matrices", () => {
      expect(service.rotate([], 1)).toStrictEqual([]);
      expect(service.rotate([[]], 1)).toStrictEqual([[]]);
    });
  });

  describe("submatrices", () => {
    it("extracts submatrix kernels with horizontal wrapping", () => {
      const matrix = service.fromCode("02x02y36c9");
      const submatrices = service.submatrices(matrix, 2, 2);

      expect(submatrices).toHaveLength(2);

      const first = submatrices[0];

      expect(first?.row).toBe(0);
      expect(first?.column).toBe(0);
      expect(first?.height).toBe(2);
      expect(first?.width).toBe(2);
      expect(first?.matrix).toStrictEqual(matrix);

      const second = submatrices[1];

      expect(second?.row).toBe(0);
      expect(second?.column).toBe(1);
      expect(second?.height).toBe(2);
      expect(second?.width).toBe(2);
      expect(second?.matrix[0]?.[0]).toStrictEqual(matrix[0]?.[1]);
      expect(second?.matrix[0]?.[1]).toStrictEqual(matrix[0]?.[0]);
    });

    it("extracts 1x1 submatrices across all rows and columns", () => {
      const matrix = service.fromCode("02x02y36c9");
      const submatrices = service.submatrices(matrix, 1, 1);

      expect(submatrices).toHaveLength(4);
      expect(submatrices[0]?.matrix[0]?.[0]).toStrictEqual(matrix[0]?.[0]);
      expect(submatrices[1]?.matrix[0]?.[0]).toStrictEqual(matrix[0]?.[1]);
      expect(submatrices[2]?.matrix[0]?.[0]).toStrictEqual(matrix[1]?.[0]);
      expect(submatrices[3]?.matrix[0]?.[0]).toStrictEqual(matrix[1]?.[1]);
    });

    it("returns empty array when submatrix dimensions exceed matrix bounds", () => {
      const matrix = service.fromCode("02x02y36c9");

      expect(service.submatrices(matrix, 3, 2)).toStrictEqual([]);
    });

    it("returns empty array for non-positive dimensions or empty matrix", () => {
      const matrix = service.fromCode("02x02y36c9");

      expect(service.submatrices(matrix, 0, 2)).toStrictEqual([]);
      expect(service.submatrices(matrix, 2, 0)).toStrictEqual([]);
      expect(service.submatrices([], 1, 1)).toStrictEqual([]);
      expect(service.submatrices([[]], 1, 1)).toStrictEqual([]);
    });

    it("falls back to BARE_MATRIX_POINT for ragged matrix rows during submatrix extraction", () => {
      const raggedMatrix = [[BARE_MATRIX_POINT, BARE_MATRIX_POINT], []];
      const submatrices = service.submatrices(raggedMatrix, 2, 2);

      expect(submatrices[0]?.matrix[1]?.[0]).toStrictEqual(BARE_MATRIX_POINT);
    });
  });

  describe("toCode edge cases", () => {
    it("returns 00x00y for empty matrices", () => {
      expect(service.toCode([])).toBe("00x00y");
      expect(service.toCode([[]])).toBe("00x00y");
    });

    it("formats with repeats > 1", () => {
      const matrix = service.fromCode("02x02y36c9");
      const codeWithRepeats = service.toCode(matrix, 2);

      expect(codeWithRepeats).toBe("02x02y36c9r02");
    });
  });
});
