import { Injectable } from "@nestjs/common";

import type { Matrix, MatrixPointArm } from "../../matrix/matrix.types";
import type { SubmatrixWindow } from "../characteristics.types";
import type { GlyphCell } from "./submatrix.types";

/**
 * Shared submatrix readings every submatrix group injects: a point's Code digit
 * (`pointDigitAt`), the count of points carrying a given arm
 * (`countPointsWithArm`, every directional edge count) and of points with
 * exactly a given arm set (`countPointsWithExactArms`), and the exact
 * isolated-glyph template match (`countIsolatedGlyphs`) with the LaTeX formula
 * (`glyphFormula`) and the submatrix window (`glyphWindow`) that describe it.
 */
@Injectable()
export class SubmatrixUtilitiesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /**
   * Each template's glyph points, parsed once however many boards count it.
   * Keyed weakly by the template, so a parse lives no longer than its template.
   */
  private readonly cellsByTemplate = new WeakMap<
    readonly string[],
    GlyphCell[]
  >();

  /**
   * Each board's digit grid, built once however many templates count it.
   * Keyed weakly by the matrix, so a grid lives no longer than its board.
   * Keying by identity assumes a board is never mutated after its first
   * count, the same assumption {@link LetterUtilitiesService}'s count cache
   * makes; a mutated board would keep reading its stale grid.
   */
  private readonly digitGrids = new WeakMap<
    Matrix,
    readonly (readonly number[])[]
  >();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The glyph points of a
   * {@link SubmatrixUtilitiesService.countIsolatedGlyphs} template, with each
   * blank `.` left out.
   */
  private glyphCells(template: readonly string[]): GlyphCell[] {
    const parsed = this.cellsByTemplate.get(template);
    if (parsed !== undefined) {
      return parsed;
    }

    const cells = template.flatMap((line, row) =>
      Array.from({ length: line.length }, (_unused, column) => ({
        character: line.charAt(column),
        column,
      }))
        .filter(({ character }) => character !== ".")
        .map(({ character, column }) => ({
          column,
          digit: Number.parseInt(character, 16),
          row,
        })),
    );
    this.cellsByTemplate.set(template, cells);
    return cells;
  }

  /** Whether the glyph `cells` sit on `grid` with their top-left corner at `(row, column)`, columns wrapping. */
  private matchesAt(
    grid: readonly (readonly number[])[],
    cells: readonly GlyphCell[],
    corner: { column: number; row: number },
  ): boolean {
    for (const cell of cells) {
      const digits = grid[corner.row + cell.row] ?? [];
      if (
        digits[(corner.column + cell.column) % digits.length] !== cell.digit
      ) {
        return false;
      }
    }

    return true;
  }

  // 🌎 Public Methods

  /**
   * Counts the minimal isolated glyphs of a matrix drawn exactly as `template`.
   *
   * The template holds one string per row and one character per point: the
   * point's hexadecimal Code digit (north 8, south 4, east 2, west 1), or `.`
   * for a point outside the glyph. A window matches when every glyph point
   * carries exactly its template arms. A template's arms all stay inside the
   * glyph, so an exact match is a whole piece of ink — nothing joins it, which
   * is what makes it isolated, and why each piece matches at one window only.
   * Columns wrap, so a glyph may cross the tile's seam; a glyph wider than the
   * tile would overlap its own repeat and is never counted.
   *
   * "Nothing joins it" assumes the agreement invariant: every arm is
   * reciprocated by its neighbor, the way {@link TileService.assertWellFormed}
   * checks. A context built from a malformed Code can disagree with itself, and
   * this function does not detect that.
   */
  public countIsolatedGlyphs(
    matrix: Matrix,
    template: readonly string[],
  ): number {
    const cells = this.glyphCells(template);
    const width = Math.max(0, ...template.map((line) => line.length));
    const columns = matrix[0]?.length ?? 0;
    if (width > columns) {
      return 0;
    }

    const grid = this.digitGrid(matrix);
    let count = 0;
    for (let row = 0; row + template.length <= grid.length; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (this.matchesAt(grid, cells, { column, row })) {
          count += 1;
        }
      }
    }

    return count;
  }

  /**
   * Counts the points whose ink leaves by `arm`, whatever other arms they
   * carry — a lone arm, a straight edge, a corner, a fork, and a cross all
   * count once — which is every directional edge count.
   */
  public countPointsWithArm(matrix: Matrix, arm: MatrixPointArm): number {
    let count = 0;

    for (const row of matrix) {
      for (const point of row) {
        if (point[arm]) {
          count += 1;
        }
      }
    }

    return count;
  }

  /**
   * Counts the points whose ink leaves by exactly `arms` — every named arm set
   * and every other arm clear — which is the whole of every 1×1 submatrix
   * characteristic: a bare point is `[]`, a corner two perpendicular arms, a
   * fork three, and a cross all four.
   */
  public countPointsWithExactArms(
    matrix: Matrix,
    arms: readonly MatrixPointArm[],
  ): number {
    const east = arms.includes("east");
    const north = arms.includes("north");
    const south = arms.includes("south");
    const west = arms.includes("west");
    let count = 0;

    for (const row of matrix) {
      for (const point of row) {
        if (
          point.east === east &&
          point.north === north &&
          point.south === south &&
          point.west === west
        ) {
          count += 1;
        }
      }
    }

    return count;
  }

  /**
   * Every point's hexadecimal Code digit, row by row, as
   * {@link SubmatrixUtilitiesService.pointDigitAt} spells it. Built once per
   * board and shared by every template counted on it, so a board's arms are
   * read once rather than once per template and window.
   *
   * The grid returned is that shared one, so a caller must not mutate it, and
   * it stays correct only while the board itself is never mutated after its
   * first count.
   */
  public digitGrid(matrix: Matrix): readonly (readonly number[])[] {
    const built = this.digitGrids.get(matrix);
    if (built !== undefined) {
      return built;
    }

    const grid = matrix.map((points, row) =>
      points.map((_point, column) => this.pointDigitAt(matrix, row, column)),
    );
    this.digitGrids.set(matrix, grid);
    return grid;
  }

  /**
   * Typesets a {@link SubmatrixUtilitiesService.countIsolatedGlyphs} template
   * as the LaTeX definition of its characteristic — the count of isolated
   * windows equal to the template, with its digits as a matrix and each blank
   * as a centered dot.
   */
  public glyphFormula(template: readonly string[]): string {
    const rows = template
      .map((line) =>
        Array.from({ length: line.length }, (_unused, column) =>
          line.charAt(column) === "." ? String.raw`\cdot` : line.charAt(column),
        ).join(" & "),
      )
      .join(String.raw` \\ `);

    return String.raw`\left|\left\{\, W \subseteq M : W \equiv \begin{matrix} ${rows} \end{matrix},\ W \text{ isolated} \,\right\}\right|`;
  }

  /**
   * The window a {@link SubmatrixUtilitiesService.countIsolatedGlyphs}
   * template reads: one column per character of its widest line, blanks
   * included, and one row per line — the `submatrix` metadata of every glyph
   * characteristic, derived so it cannot disagree with the template.
   */
  public glyphWindow(template: readonly string[]): SubmatrixWindow {
    return {
      columns: Math.max(0, ...template.map((line) => line.length)),
      rows: template.length,
    };
  }

  /**
   * The hexadecimal Code digit of the point at `(row, column)` — north 8,
   * south 4, east 2, west 1 — with columns wrapping, or -1 past the top or
   * bottom row, which no digit equals.
   */
  public pointDigitAt(matrix: Matrix, row: number, column: number): number {
    const points = matrix[row] ?? [];
    const point =
      points[((column % points.length) + points.length) % points.length];
    if (point === undefined) {
      return -1;
    }

    return (
      (point.north ? 8 : 0) +
      (point.south ? 4 : 0) +
      (point.east ? 2 : 0) +
      (point.west ? 1 : 0)
    );
  }
}
