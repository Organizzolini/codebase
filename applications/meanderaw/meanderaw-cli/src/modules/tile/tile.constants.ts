// ♟️ Constants

/**
 * The smallest `rows` value a `mosaic` tile is worth enumerating at.
 *
 * Two, where a tile's interior is two point rows — enough for a southward
 * edge to join them, which is the shallowest tile that can hold one. Below
 * it the interior is a single row with nothing under it, so the only
 * tiles are a bare point and the wrapped rule and there is nothing to
 * permute.
 *
 * It was 3 while the space at two rows held four tiles. The budget is
 * what makes two worth drawing: it admits five column spans there,
 * against one at five rows, so the shallowest band is where the family is
 * widest.
 */

// 🚨 Errors

/**
 * Thrown when a grid of direction bits is not a tile: two adjoining points
 * disagree about the edge between them, a point at the first row claims a
 * `north` or one at the last claims a `south`, or the grid is not the size
 * its own `rows` and `columns` declare.
 *
 * Refusing these is what makes the bits a bijection with the drawing. A
 * disagreeing pair would have to render as a half-unit stub ending between
 * lattice lines, which nothing on the lattice admits.
 */
export class MalformedTileError extends Error {
  constructor(reason: string) {
    super(`direction bits do not describe a mosaic tile: ${reason}`);
    this.name = "MalformedTileError";
  }
}
