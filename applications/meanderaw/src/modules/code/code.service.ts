import { Inject, Injectable } from "@nestjs/common";

import { SymmetryService } from "../symmetry/symmetry.service";

import {
  CODE_FORMAT_PATTERN,
  HEXADECIMAL_DIGIT_PATTERN,
  InvalidCodeCharacterError,
  InvalidCodeFormatError,
  InvalidCodeLengthError,
} from "./code.constants";

import type { Directions, Tile } from "../tile/tile.types";
import type { Code, CodeObject } from "./code.types";

/**
 * Owns a meander's Code: reading one, reading a lattice point's four
 * direction bits out of it, spelling a tile into one, and rotating its
 * phase.
 *
 * Encoding and decoding are two directions of a single conversion, so they
 * sit together rather than in two similarly named modules. {@link parse} and
 * {@link directionsAt} go from the string to the ink; {@link spell} goes
 * back; {@link tile} is {@link spell}'s inverse at the whole-tile
 * granularity, for the one caller that needs the tile vocabulary rather than
 * a point at a time.
 *
 * **A Code is read in place.** Every bit is decoded literally off its own
 * digit at `row * columns + column` rather than derived from a neighbor:
 * north and west are redundant with the previous point's south and east
 * under the lattice's own agreement invariant, but a Code spells all four
 * bits out per point regardless, and reading what is written is simpler than
 * re-deriving it and trusting an invariant nothing here has checked. There
 * is no intermediate grid — walking a Code is indexing a string, and the
 * array of arrays that used to stand between the two gave nothing the string
 * does not.
 *
 * **The spelling is deliberately redundant.** Four bits per point describes
 * `4 * columns * rows` bits where a tile has only
 * `columns * (2 * rows - 1)` degrees of freedom, because every edge is
 * written twice, once at each end. That is the same redundancy
 * `TileService.assertWellFormed` checks, and paying it buys a Code
 * whose characters are the meander's own points: `0` is a dot, `3` a
 * horizontal straight, `c` a vertical straight, `5`/`6`/`9`/`a` the corners,
 * `7`/`b`/`d`/`e` the T-junctions, `f` a crossing. A reader decodes a Code
 * point by point without a table, which is the whole reason it reads this
 * way.
 */
@Injectable()
export class CodeService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SymmetryService)
    private readonly symmetryService: SymmetryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** One digit's four direction bits, worth `8` north, `4` south, `2` east, `1` west. */
  private decode(value: number): Directions {
    return {
      east: (value & 0b0010) !== 0,
      north: (value & 0b1000) !== 0,
      south: (value & 0b0100) !== 0,
      west: (value & 0b0001) !== 0,
    };
  }

  /**
   * Checks if a column span repeats exactly to fill the Code.
   */
  private isRepeatingUnit(code: CodeObject, width: number): boolean {
    const { columns, digits, rows } = code;
    for (let row = 0; row < rows; row += 1) {
      const rowSlice = digits.slice(row * columns, (row + 1) * columns);
      const piece = rowSlice.slice(0, width);
      if (piece.repeat(columns / width) !== rowSlice) {
        return false;
      }
    }
    return true;
  }

  /** Parses bare hexadecimal digits with explicit dimensions into a `CodeObject`. */
  private parseBare(code: string, rows: number, columns: number): CodeObject {
    this.validateDigits(code, rows, columns);

    return {
      columns,
      digits: code.toLowerCase(),
      repeats: 1,
      rows,
    };
  }

  /** Parses a self-contained code string match into a `CodeObject`. */
  private parseFormatted(match: RegExpExecArray): CodeObject {
    const {
      columns: rawColumns = "",
      digits: rawDigits = "",
      repeats: rawRepeats = "1",
      rows: rawRows = "",
    } = match.groups ?? {};
    const parsedColumns = Number.parseInt(rawColumns, 10);
    const parsedRows = Number.parseInt(rawRows, 10);
    const repeats = Number.parseInt(rawRepeats, 10);
    const digits = rawDigits.toLowerCase();

    this.validateDigits(digits, parsedRows, parsedColumns);

    return {
      columns: parsedColumns,
      digits,
      repeats,
      rows: parsedRows,
    };
  }

  /** Validates that digits match expected length for the shape and are valid hexadecimal. */
  private validateDigits(digits: string, rows: number, columns: number): void {
    if (digits.length !== rows * columns) {
      throw new InvalidCodeLengthError(digits, rows, columns);
    }

    for (const character of digits) {
      if (!HEXADECIMAL_DIGIT_PATTERN.test(character)) {
        throw new InvalidCodeCharacterError(character, digits);
      }
    }
  }

  // 🌎 Public Methods

  /**
   * The canonical phase of a Code is the one that minimizes its
   * tile-crossing component delta, breaking ties by choosing the
   * lexicographically smallest Code string.
   *
   * The group of phases defaults to every cyclic column rotation.
   */
  canonicalPhase(
    code: CodeObject,
    scoreTileCrossing: (phase: CodeObject) => number,
    group: (code: CodeObject) => CodeObject[] = (c) =>
      Array.from({ length: c.columns }, (_, index) => this.rotate(c, index)),
  ): CodeObject {
    let best = code;
    let minimumTileCrossingScore = Infinity;

    for (const phase of group(code)) {
      const tileCrossingScore = scoreTileCrossing(phase);

      if (
        tileCrossingScore < minimumTileCrossingScore ||
        (tileCrossingScore === minimumTileCrossingScore &&
          phase.digits < best.digits)
      ) {
        best = phase;
        minimumTileCrossingScore = tileCrossingScore;
      }
    }

    return best;
  }

  /**
   * The four direction bits the point at `(row, column)` carries, read off
   * the single character at `row * columns + column`.
   *
   * A position outside the Code's own extent carries no ink at all. That is
   * not a tolerated fallback but what the lattice says: the rows above the
   * first and below the last are the band's two border rules, which are cap
   * ticks rather than points of the repeat, so there is nothing there for a
   * bit to be set on.
   */
  directionsAt(code: CodeObject, row: number, column: number): Directions {
    const { columns, digits, rows } = code;

    if (row < 0 || row >= rows || column < 0 || column >= columns) {
      return { east: false, north: false, south: false, west: false };
    }

    return this.decode(
      Number.parseInt(digits[row * columns + column] ?? "0", 16),
    );
  }

  /**
   * Formats a `CodeObject` into the self-contained Code string in the format
   * `{columns}x{rows}y{digits}` (or `{columns}x{rows}y{digits}r{repeats}` when `repeats > 1`),
   * with 2-digit zero-padding on `columns`, `rows`, and `repeats`.
   */
  format(code: CodeObject): Code {
    const columns = String(code.columns).padStart(2, "0");
    const rows = String(code.rows).padStart(2, "0");
    const repeatSuffix =
      code.repeats > 1 ? `r${String(code.repeats).padStart(2, "0")}` : "";

    return `${columns}x${rows}y${code.digits.toLowerCase()}${repeatSuffix}`;
  }

  /**
   * Reads `code`, either as a self-contained string formatted as
   * `{columns}x{rows}y{digits}r{repeats}` or as bare hexadecimal digits at the given
   * `rows` and `columns`.
   *
   * Refuses a length that disagrees with `rows` and `columns` or a character
   * outside the hexadecimal alphabet.
   */
  parse(code: Code, rows?: number, columns?: number): CodeObject {
    const match = CODE_FORMAT_PATTERN.exec(code);
    if (match !== null) {
      return this.parseFormatted(match);
    }

    if (rows !== undefined && columns !== undefined) {
      return this.parseBare(code, rows, columns);
    }

    throw new InvalidCodeFormatError(code);
  }

  /**
   * Reduces a Code to its smallest repeating unit by finding the smallest
   * column span that divides the Code's columns and repeats exactly to fill them.
   */
  reduceToUnit(code: CodeObject): CodeObject {
    const { columns, digits, repeats, rows } = code;

    for (let width = 1; width <= columns; width += 1) {
      if (columns % width !== 0) {
        continue;
      }

      if (this.isRepeatingUnit(code, width)) {
        let reducedDigits = "";
        for (let row = 0; row < rows; row += 1) {
          reducedDigits += digits.slice(row * columns, row * columns + width);
        }

        return {
          columns: width,
          digits: reducedDigits,
          repeats,
          rows,
        };
      }
    }

    return code;
  }

  /**
   * The Code shifted `shift` columns west, wrapping each row around its own
   * span — the same band cut at a different place.
   *
   * A Code repeats forever east and west, so a cyclic shift of its columns
   * re-phases the pattern without changing it: the point at
   * `(row, column)` moves to `(row, column - shift)` carrying all four of
   * its bits, which for a row-major reading is a rotation of each row's own
   * substring and nothing more. The bits travel unchanged because a shift
   * moves the whole lattice rather than the ink across it.
   *
   * A negative or oversized `shift` is taken modulo the column span rather
   * than refused, since every integer names a real phase.
   */
  rotate(code: CodeObject, shift: number): CodeObject {
    const { columns, digits, rows } = code;
    const offset = ((shift % columns) + columns) % columns;
    const rotated = Array.from({ length: rows }, (_unused, row) => {
      const rowSlice = digits.slice(row * columns, (row + 1) * columns);

      return rowSlice.slice(offset) + rowSlice.slice(0, offset);
    });

    return { ...code, digits: rotated.join("") };
  }

  /**
   * Names a tile as a self-contained Code string in the format
   * `{columns}x{rows}y{digits}r{repeats}`: its {@link spellDigits}, with
   * 2-digit zero-padding on columns, rows, and repeats.
   */
  spell(tile: Tile, repeats = 1): string {
    return this.format({
      columns: tile.columns,
      digits: this.spellDigits(tile),
      repeats,
      rows: tile.rows,
    });
  }

  /**
   * The Code every tile in a symmetry class shares: {@link spell} of the one
   * member `SymmetryService.canonicalTile` picks. Two tiles draw the
   * same pattern exactly when their canonical Codes match.
   */
  spellCanonical(tile: Tile, repeats = 1): string {
    return this.spell(this.symmetryService.canonicalTile(tile), repeats);
  }

  /**
   * A tile's digits alone: one lowercase hexadecimal character per point, in
   * reading order, worth `8` for `north`, `4` for `south`, `2` for `east` and
   * `1` for `west` — exactly `rows × columns` of them, whatever the Code the
   * tile was read from spelled.
   */
  spellDigits(tile: Tile): string {
    return tile.points
      .flatMap((row) =>
        row.map((point) =>
          (
            (point.north ? 8 : 0) +
            (point.south ? 4 : 0) +
            (point.east ? 2 : 0) +
            (point.west ? 1 : 0)
          ).toString(16),
        ),
      )
      .join("");
  }

  /**
   * The Codes of every other member of `code`'s symmetry class — its mirror,
   * its flip, and both — each at its own canonical phase, sorted.
   *
   * These are the meanders the draw run folds into this one row, so they are
   * recorded beside it rather than lost: a Code that names a member of the
   * class names this row. A meander a reflection maps onto itself names
   * nothing, and `code` itself is never listed. `scoreTileCrossing` is the
   * score {@link canonicalPhase} ranks phases by, so each Code is the one a
   * row of its own would have stored.
   */
  symmetricalCodes(
    code: CodeObject,
    scoreTileCrossing: (phase: CodeObject) => number,
  ): string[] {
    const own = this.format(code);
    const codes = new Set(
      this.symmetryService
        .reflections(this.tile(code))
        .map((reflection) =>
          this.format(
            this.canonicalPhase(
              { ...code, digits: this.spellDigits(reflection) },
              scoreTileCrossing,
            ),
          ),
        ),
    );

    codes.delete(own);

    return [...codes].toSorted();
  }

  /**
   * The tile a Code names, as the tile vocabulary rather than a point at a
   * time — {@link spell} read backwards.
   *
   * It is the one decoding a caller needs the whole shape for, and it is
   * deliberately the exception: reading a point's bits where they are needed
   * costs one index, while building a tile allocates one object per lattice
   * point. A caller measuring a Code reaches for {@link directionsAt}; a
   * caller asking a question the tile vocabulary already answers reaches for
   * this.
   */
  tile(code: CodeObject): Tile {
    const { columns, rows } = code;

    return {
      columns,
      points: Array.from({ length: rows }, (_row, row) =>
        Array.from({ length: columns }, (_column, column) =>
          this.directionsAt(code, row, column),
        ),
      ),
      rows,
    };
  }
}
