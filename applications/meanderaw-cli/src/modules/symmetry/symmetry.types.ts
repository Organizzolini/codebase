// 🏷️ Types

/**
 * How a point is reached, ranked in the order the family's original
 * exact-cover search discovered covers in: `0` a bare point, `1` one
 * anchoring a southward edge, `2` one anchoring an eastward edge, `3` one
 * reached only by a neighbor's edge.
 *
 * A union rather than a plain number so a rank cannot be invented: there are
 * exactly four ways a point is reached, and a reader indexing by one needs no
 * fallback for a rank that does not exist.
 */
export type PointRank = 0 | 1 | 2 | 3;

/** One group element, plus the shape it is acting on and which of a tile's two edge directions is being moved. */
export interface Transform extends TransformChoice {
  readonly columns: number;
  readonly isHorizontal: boolean;
  readonly rows: number;
}

/** One element of the symmetry group `SymmetryService` folds a tile by: a column shift, optionally mirrored, optionally flipped. */
export interface TransformChoice {
  readonly flip: boolean;
  readonly mirror: boolean;
  readonly shift: number;
}
