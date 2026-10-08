import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";

import { BARE_MATRIX_POINT } from "./matrix.constants";

import type { Code, CodeObject } from "../code/code.types";
import type { Matrix, MatrixPoint, Submatrix } from "./matrix.types";

/**
 * Owns 2D matrix transformations for meander patterns: converting to and from
 * meander Code strings, coordinate lookups with column wrapping, cyclic column
 * rotation, and arbitrary sliding kernel submatrix extraction.
 */
@Injectable()
export class MatrixService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Extracts a 2D submatrix kernel starting at the given origin with the specified size.
   */
  private extractSubmatrix(
    matrix: Matrix,
    origin: { readonly column: number; readonly row: number },
    size: {
      readonly columnCount: number;
      readonly height: number;
      readonly width: number;
    },
  ): MatrixPoint[][] {
    return Array.from({ length: size.height }, (_unusedRow, deltaRow) => {
      const row = matrix[origin.row + deltaRow];

      return Array.from(
        { length: size.width },
        (_unusedColumn, deltaColumn) => {
          const columnIndex =
            (((origin.column + deltaColumn) % size.columnCount) +
              size.columnCount) %
            size.columnCount;

          return row?.[columnIndex] ?? BARE_MATRIX_POINT;
        },
      );
    });
  }

  // 🌎 Public Methods

  /**
   * Converts a meander Code string (self-contained formatted or bare hexadecimal digits with dimensions)
   * or a `CodeObject` into a 2D Matrix indexed as `[row][column]`.
   */
  fromCode(code: Code | CodeObject, rows?: number, columns?: number): Matrix {
    const parsed =
      typeof code === "string"
        ? this.codeService.parse(code, rows, columns)
        : code;
    const rowCount = parsed.rows;
    const columnCount = parsed.columns;

    return Array.from({ length: rowCount }, (_unusedRow, row) =>
      Array.from({ length: columnCount }, (_unusedColumn, column) =>
        this.codeService.directionsAt(parsed, row, column),
      ),
    );
  }

  /**
   * Returns the `MatrixPoint` at the given `(row, column)` coordinates,
   * wrapping columns cyclically modulo the column count, and returning `BARE_MATRIX_POINT`
   * if `row` is out of bounds.
   */
  pointAt(matrix: Matrix, row: number, column: number): MatrixPoint {
    const rowCount = matrix.length;
    const columnCount = matrix[0]?.length ?? 0;

    if (columnCount === 0 || row < 0 || row >= rowCount) {
      return BARE_MATRIX_POINT;
    }

    const wrappedColumn = ((column % columnCount) + columnCount) % columnCount;

    return matrix[row]?.[wrappedColumn] ?? BARE_MATRIX_POINT;
  }

  /**
   * Shifts/rotates columns of the matrix by `step` positions westward with cyclic column wrapping.
   */
  rotate(matrix: Matrix, step: number): Matrix {
    if (matrix.length === 0) {
      return [];
    }

    const columnCount = matrix[0]?.length ?? 0;
    if (columnCount === 0) {
      return matrix;
    }

    const offset = ((step % columnCount) + columnCount) % columnCount;

    return matrix.map((row) => [...row.slice(offset), ...row.slice(0, offset)]);
  }

  /**
   * Extracts sliding submatrix kernels of size `height x width` over the matrix with horizontal column wrapping.
   */
  submatrices(matrix: Matrix, height: number, width: number): Submatrix[] {
    const firstRow = matrix[0];
    if (
      height <= 0 ||
      width <= 0 ||
      matrix.length < height ||
      !firstRow ||
      firstRow.length === 0
    ) {
      return [];
    }

    const rowCount = matrix.length;
    const columnCount = firstRow.length;
    const items: Submatrix[] = [];

    for (let row = 0; row <= rowCount - height; row += 1) {
      for (let column = 0; column < columnCount; column += 1) {
        items.push({
          column,
          height,
          matrix: this.extractSubmatrix(
            matrix,
            { column, row },
            { columnCount, height, width },
          ),
          row,
          width,
        });
      }
    }

    return items;
  }

  /**
   * Encodes a 2D Matrix back into a formatted meander Code string.
   */
  toCode(matrix: Matrix, repeats = 1): Code {
    const rowCount = matrix.length;
    const columnCount = matrix[0]?.length ?? 0;

    if (rowCount === 0 || columnCount === 0) {
      return "00x00y";
    }

    const digits = matrix
      .flatMap((row) =>
        row.map((point: MatrixPoint) =>
          (
            (point.north ? 8 : 0) +
            (point.south ? 4 : 0) +
            (point.east ? 2 : 0) +
            (point.west ? 1 : 0)
          ).toString(16),
        ),
      )
      .join("");

    return this.codeService.format({
      columns: columnCount,
      digits,
      repeats,
      rows: rowCount,
    });
  }
}
