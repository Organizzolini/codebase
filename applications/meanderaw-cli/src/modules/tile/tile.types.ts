// 🏷️ Types

/**
 * The four bits one point of a {@link Tile} carries: whether ink
 * leaves it north, south, east, or west. `0000` is a dot, `1100` a corner,
 * `1110` a T-junction, `1111` a crossing.
 *
 * The bits are twice-redundant by design, and the redundancy is
 * `TileService`'s checked invariant rather than a tolerated cost:
 * `east` at one point is `west` at the point to its right, wrapping from
 * the last column into the next repeat, and `south` is `north` at the point
 * below. That agreement is what makes a tile's bits denote exactly one
 * drawing — no two assignments draw the same pattern, and no assignment
 * draws none — and the east–west wrap at the last column **is** what makes
 * a tile join up with its own next repeat, stated once here rather than
 * handled wherever a dash used to reach past the tile's edge.
 */
export interface Directions {
  readonly east: boolean;
  readonly north: boolean;
  readonly south: boolean;
  readonly west: boolean;
}

/**
 * A tile's edges, held once each rather than twice. `horizontal[row]` runs
 * `0…columns - 1`, indexed by every interior row; `vertical[row]`
 * likewise, indexed by every row that has one below it.
 *
 * This is the form a tile is built from and folded in, because it is the
 * one whose entries are exactly the tile's own degrees of freedom: a shape
 * holds `2^(columns * (2 * rows - 1))` tiles, which is this structure's own
 * size. {@link Directions} is the form a tile is read in.
 */
export interface Edges {
  readonly horizontal: readonly (readonly boolean[])[];
  readonly vertical: readonly (readonly boolean[])[];
}

/**
 * A tile's edges while they are still being filled in, before
 * `TileService.build` freezes them into a tile. Same shape as
 * {@link Edges}, with the rows left mutable so a caller can mark one
 * edge at a time rather than computing every entry up front.
 */
export interface EdgesDraft {
  readonly horizontal: boolean[][];
  readonly vertical: boolean[][];
}

/**
 * One repeat tile of the `mosaic` family: a `columns` by `rows` grid of
 * lattice points, each carrying the four direction bits that say where ink
 * leaves it. The two border rules at y = 0 and y = `rows + 1` are the cap
 * ticks rather than tile points, so a point at the first row carries no
 * `north` and one at the last carries no `south`.
 *
 * A point on no edge at all *is* an inked dot, which is what makes every
 * mosaic space-filling for free: every point carries ink, and neighboring
 * points sit one grid unit apart, so no blank is ever wider than the
 * stroke. `bars split`, `dots`, `dashes`, and `lines` are all members of
 * this one family.
 *
 * `points` is indexed `[row][column]`, `row` running `0…rows - 1`.
 */
export interface Tile {
  readonly columns: number;
  readonly points: readonly (readonly Directions[])[];
  readonly rows: number;
}

/** Which point of a tile is being talked about, grouped into one object so a method naming it stays inside the workspace's parameter limit. */
export interface TilePoint {
  readonly column: number;
  readonly row: number;
}

/** The size of a tile, apart from anything drawn on it: how deep a band one repeat spans, and how many columns. */
export interface TileShape {
  readonly columns: number;
  readonly rows: number;
}
