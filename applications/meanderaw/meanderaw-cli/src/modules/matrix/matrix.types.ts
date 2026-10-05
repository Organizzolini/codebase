// 🏷️ Types

/**
 * A 2D grid of lattice points representing a meander pattern, indexed as
 * `[row][column]`.
 */
export type Matrix = readonly (readonly MatrixPoint[])[];

/**
 * The four directional ink connections at a single lattice point in a 2D matrix:
 * whether ink travels north, south, east, or west.
 */
export interface MatrixPoint {
  readonly east: boolean;
  readonly north: boolean;
  readonly south: boolean;
  readonly west: boolean;
}

/** One of the four directions a point's ink can leave it by. */
export type MatrixPointArm = keyof MatrixPoint;

/**
 * A submatrix kernel extracted from a larger Matrix during submatrix scanning operations.
 */
export interface Submatrix {
  readonly column: number;
  readonly height: number;
  readonly matrix: Matrix;
  readonly row: number;
  readonly width: number;
}
