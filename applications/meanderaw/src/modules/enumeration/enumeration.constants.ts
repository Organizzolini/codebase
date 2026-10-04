// ♟️ Constants

/**
 * The shallowest band worth enumerating, and the one number this draw run adds
 * to the edge budget it otherwise inherits whole.
 *
 * Two, where a tile's interior is two point rows — enough for a southward
 * edge to join them, which is the shallowest tile that can hold one. Below
 * it the interior is a single row with nothing under it, so no southward edge
 * exists anywhere in it and the whole space is the horizontal necklaces. Not
 * one family's defining combination is about a repeat like that — every rule
 * `ClassificationService` states either counts a junction, a loop, or
 * a piece, and a band with no vertical ink can close nothing and fork
 * nowhere — so a draw run that included one row would be spending its widest
 * shape on the corner of the space no family lives in. The budget alone
 * admits twenty-four columns there, which is 2 ** 24 assignments folded
 * through a symmetry group of 96 elements, and the largest single cost in the
 * draw run by some distance.
 *
 * There is deliberately no maximum here to match it. The budget decides the
 * deepest band, which is twelve rows at one column — see
 * `EnumerationService.shapes` — and a second number saying so would
 * be a number that could disagree with it.
 */
export const DRAW_MINIMUM_ROWS = 2;

/**
 * How many edges one `mosaic` tile may hold, which is the one knob the size
 * of its space depends on.
 *
 * A tile of `rows` by `columns` holds exactly `columns * (2 * rows - 1)`
 * edges, and every subset of them is a tile — so a shape holds
 * `2 ** edges` tiles and rows and columns are not independent knobs.
 * Capping each alone caps neither: 5 rows is fine, 5 columns is fine, and a
 * 5 by 5 tile is 2 ** 45 of them.
 *
 * Twenty-four admits twenty-five shapes and 7,059,159 distinct meanders —
 * twelve rows deep at one column, eight columns wide at two rows — drawn,
 * pages included, in about thirteen and a half minutes across worker
 * threads, with a peak of under eight gigabytes. Twenty-two admitted
 * twenty-three shapes and 2,331,597 in about four and a half minutes, and
 * sixteen admitted fourteen shapes and 30,279 in about thirty seconds.
 * Twenty-six would admit about 34 million, its largest shape alone nearly
 * 17 million: each edge added roughly doubles both the walk and the corpus.
 * Raising it is a one-line change with a visible effect on the shapes
 * `enumeration.service.unit.test.ts` asserts, which is the point of making it
 * one number. The suites that run a whole draw run pin their own budget
 * instead, so raising this does not slow them.
 *
 * It replaces a maximum column span, which was the knob while a degree
 * ceiling was doing most of the clamping. There is no degree ceiling now —
 * a point may carry any of the sixteen direction-bit patterns, junctions and
 * crossings included — so this is the only thing bounding the family, and it
 * has to be. At 5 rows adding one column multiplies the space by 2 ** 9,
 * which is about what removing the degree ceiling costs in total.
 *
 * This is now only the *default*. `TileEnumerationService` reads the
 * effective budget from `DRAW_EDGE_BUDGET`, and this constant is what that
 * environment variable defaults to, so a bare invocation walks exactly the
 * space it walks today.
 */
export const EDGE_BUDGET = 24;

/**
 * Thrown when a tile shape holds more edges than the configured budget
 * admits.
 *
 * Refusing is the useful answer rather than a strict one. Enumeration walks
 * `2 ** edges` assignments, so a shape a little past the budget is not a
 * slow run but one that does not finish — and the budget exists precisely so
 * that the size of the space is a decision somebody made rather than a
 * surprise somebody discovers.
 */
export class OversizedTileError extends Error {
  constructor(
    shape: { columns: number; rows: number },
    edges: number,
    budget: number,
  ) {
    super(
      `a ${shape.rows}-row tile of ${shape.columns} columns holds ${edges} edges, past the budget of ${budget}`,
    );
    this.name = "OversizedTileError";
  }
}
