// 🏷️ Types

/**
 * One point of a glyph template: where it sits in the glyph's bounding box
 * and the hexadecimal Code digit it must carry exactly.
 */
export interface GlyphCell extends SubmatrixOffset {
  readonly digit: number;
}

/**
 * A position within a matrix, or a step between two positions, counted in
 * lattice points: `row` grows southward and `column` eastward.
 */
export interface SubmatrixOffset {
  readonly column: number;
  readonly row: number;
}
