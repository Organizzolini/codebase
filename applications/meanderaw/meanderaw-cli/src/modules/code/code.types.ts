// 🏷️ Types

/**
 * A meander code string (either self-contained formatted or bare hexadecimal digits).
 */
export type Code = string;

/**
 * One Code with the shape it is read at, which is the whole of what a
 * meander is.
 *
 * A Code is one hexadecimal character per interior lattice point, in reading
 * order — top to bottom, left to right — so the character for the point at
 * `(row, column)` sits at `row * columns + column` and nothing more than
 * that index is needed to read it. {@link CodeService.directionsAt} is that
 * arithmetic written once.
 *
 * It replaces a decoded grid of direction bits, `readonly (readonly …[])[]`,
 * that every consumer built in order to walk. The array of arrays gave
 * nothing the string does not: the same points in the same order, at the
 * cost of allocating one object per lattice point of every one of the 31,244
 * meanders the draw run draws. What survives of it is the four-direction
 * reading a caller gets back for one point, which is where the bit meanings
 * are written down — see `Directions`.
 *
 * `rows` directly denotes the interior lattice height (the vertical count
 * of points on the lattice, so `digits.length === rows * columns`).
 */
export interface CodeObject {
  readonly columns: number;
  readonly digits: string;
  readonly repeats: number;
  readonly rows: number;
}
