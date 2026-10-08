import { Inject, Injectable } from "@nestjs/common";

import { TileService } from "../tile/tile.service";

import type { Directions, Tile, TileShape } from "../tile/tile.types";
import type { PointRank, Transform, TransformChoice } from "./symmetry.types";

/**
 * The symmetries under which two `mosaic` tiles draw the same pattern, and
 * the tile-shaped operations that act under them. A tile repeats forever in
 * both directions, so shifting its columns only re-phases the same
 * wallpaper; reversing its columns or flipping its rows mirrors it.
 * Enumerating every tile and keeping one representative per symmetry class
 * is what turns a combinatorial blow-up into a set small enough to look
 * through.
 *
 * What a representative is *called* is not here. `CodeService` spells a
 * tile out, because that spelling is the lattice's rather than the
 * symmetry group's, and it reaches this service for {@link canonicalTile} on its way
 * to a canonical name. Nothing here reaches back.
 *
 * The group has order `4 × columns` — `columns` translations, times a
 * horizontal mirror, times a vertical flip — and it acts on the tile's edges
 * rather than on its points, because an edge is where the tile's degrees of
 * freedom are. A translation moves an edge along its row; a mirror sends
 * the eastward edge leaving one point to the eastward edge *arriving* at
 * its reflection, which is why its column arithmetic differs by one from
 * the southward edge's; a flip turns the tile upside down, and a southward
 * edge lands one row higher than a horizontal one because it is indexed
 * by the upper of the two rows it joins.
 */
@Injectable()
export class SymmetryService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(TileService)
    private readonly tileService: TileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Where one group element sends each of a shape's edges, in {@link edgeKey} order. */
  private edgePermutation(
    shape: TileShape,
    element: TransformChoice,
  ): number[] {
    const { columns, rows } = shape;
    const horizontalCount = columns * rows;
    const transform = { ...element, columns, rows };
    const image = (ordinal: number, isHorizontal: boolean): number => {
      const row = Math.floor(ordinal / columns);
      const lastRow = isHorizontal ? rows - 1 : rows - 2;
      const target = element.flip ? lastRow - row : row;
      const column = this.mapColumn(ordinal % columns, {
        ...transform,
        isHorizontal,
      });

      return (isHorizontal ? 0 : horizontalCount) + target * columns + column;
    };

    return [
      ...Array.from({ length: horizontalCount }, (_edge, ordinal) =>
        image(ordinal, true),
      ),
      ...Array.from({ length: (rows - 1) * columns }, (_edge, ordinal) =>
        image(ordinal, false),
      ),
    ];
  }

  /**
   * Every element of the group at a column count, identity first: each
   * shift, plain then mirrored, each upright then flipped.
   */
  private elements(columns: number): TransformChoice[] {
    return Array.from({ length: columns }, (_element, shift) =>
      [false, true].flatMap((mirror) =>
        [false, true].map((flip) => ({ flip, mirror, shift })),
      ),
    ).flat();
  }

  /**
   * Where an edge's column lands under one group element. A horizontal
   * mirror reflects the lattice about a vertical line, so a southward edge
   * simply follows its own point while an eastward edge — which spans the
   * gap to the point on its right — lands on the gap to the reflection's
   * left, one column back.
   */
  private mapColumn(column: number, options: Transform): number {
    const { columns, isHorizontal, mirror, shift } = options;
    const reflected = mirror
      ? (isHorizontal ? -column - 1 : -column) + 2 * columns
      : column;

    return (reflected + shift) % columns;
  }

  /** Every tile the symmetry group maps `tile` to, itself included, with duplicates left in. */
  private orbit(tile: Tile): Tile[] {
    return this.elements(tile.columns).map((element) =>
      this.transform(tile, element),
    );
  }

  /**
   * Copies one direction's edges from `source` onto `target` under one group
   * element.
   *
   * A flip turns the tile upside down, and a southward edge lands one row
   * higher than an eastward one because it is indexed by the upper of the
   * two rows it joins.
   */
  private place(
    source: readonly (readonly boolean[])[],
    target: readonly boolean[][],
    options: Transform,
  ): void {
    const lastRow = options.isHorizontal ? options.rows - 1 : options.rows - 2;

    for (const [row, sourceRow] of source.entries()) {
      for (const [column, isSet] of sourceRow.entries()) {
        if (isSet) {
          this.tileService.mark(
            target,
            options.flip ? lastRow - row : row,
            this.mapColumn(column, options),
          );
        }
      }
    }
  }

  /**
   * How a point is reached, ranked in the order the retired `mosaic` generator's
   * exact-cover search discovered covers in: a bare point first, then one
   * anchoring a southward edge, then one anchoring an eastward edge, then
   * one reached only by a neighbor's edge.
   *
   * That order is what picks a class's representative, so it is stated here
   * rather than left implicit in a traversal. Two tiles that draw the same
   * pattern differ only by a symmetry, and this is the tie-break that says
   * which of them the corpus draws.
   */
  private rank(directions: Directions): PointRank {
    if (directions.south) {
      return 1;
    }

    if (directions.east) {
      return 2;
    }

    return directions.north || directions.west ? 3 : 0;
  }

  /**
   * The key {@link canonicalTile} minimizes: every point's {@link rank} in
   * reading order, then the tile's own edges, so that two tiles which rank
   * alike are still ordered by something rather than by chance.
   */
  private signature(tile: Tile): string {
    const ranks = tile.points
      .flatMap((row) => row.map((directions) => this.rank(directions)))
      .join("");

    return `${ranks}|${this.edgeKey(tile)}`;
  }

  /** The tile one group element maps `tile` to. */
  private transform(tile: Tile, options: TransformChoice): Tile {
    const { columns, rows } = tile;
    const source = this.tileService.edges(tile);
    const { horizontal, vertical } = this.tileService.blankEdges(tile);

    this.place(source.horizontal, horizontal, {
      ...options,
      columns,
      isHorizontal: true,
      rows,
    });
    this.place(source.vertical, vertical, {
      ...options,
      columns,
      isHorizontal: false,
      rows,
    });

    return this.tileService.build({ columns, rows }, { horizontal, vertical });
  }

  // 🌎 Public Methods

  /**
   * The one tile of a symmetry class the corpus draws. Every member draws
   * the same pattern up to a shift or a mirror, so which one is committed
   * is a choice rather than a fact, and {@link rank} is where that choice
   * is written down.
   */
  canonicalTile(tile: Tile): Tile {
    let best = tile;
    let smallest = this.signature(tile);

    for (const variant of this.orbit(tile)) {
      const signature = this.signature(variant);

      if (signature < smallest) {
        best = variant;
        smallest = signature;
      }
    }

    return best;
  }

  /**
   * A tile's edges as a bit string, one character each, every eastward edge
   * in reading order and then every southward one.
   *
   * It is not what a drawing is named — `CodeService.spell` is, and it
   * writes points rather than edges — and the two are kept apart
   * deliberately. This one is the tile's own degrees of freedom with nothing
   * counted twice, which is what a tie-break wants, and what
   * `TileEnumerationService.enumerate` folds its walk on; how a filename is
   * spelled is a separate question, and changing the spelling must not move
   * which member of a symmetry class the corpus draws.
   */
  edgeKey(tile: Tile): string {
    const { horizontal, vertical } = this.tileService.edges(tile);

    return [...horizontal, ...vertical]
      .flatMap((row) => row.map((isSet) => (isSet ? "1" : "0")))
      .join("");
  }

  /**
   * Every element of the group as a permutation of a shape's edges: entry
   * `ordinal` of one is the ordinal that element sends edge `ordinal` to,
   * counted in {@link edgeKey} order — every eastward edge in reading order,
   * then every southward one.
   *
   * This is {@link transform} with the tile taken out. A walk that only needs
   * to know where each edge lands can apply it to a bitmask without
   * building a tile per element, which is what lets
   * `TileEnumerationService` keep one assignment per class without
   * building every member of it. The order is {@link orbit}'s, identity
   * first.
   */
  edgePermutations(shape: TileShape): number[][] {
    return this.elements(shape.columns).map((element) =>
      this.edgePermutation(shape, element),
    );
  }

  /**
   * The tiles a mirror, a flip, and both at once map `tile` to, with no
   * shift and with duplicates left in.
   *
   * These are the members of a symmetry class a Code's own column phase
   * cannot reach: every shift of a repeat is one rotation of its Code away,
   * and `CodeService.canonicalPhase` already folds rotations, so a shift
   * names no Code a reflection does not.
   */
  reflections(tile: Tile): Tile[] {
    return [
      this.transform(tile, { flip: false, mirror: true, shift: 0 }),
      this.transform(tile, { flip: true, mirror: false, shift: 0 }),
      this.transform(tile, { flip: true, mirror: true, shift: 0 }),
    ];
  }

  /**
   * Every distinct tile that draws the same pattern as `tile`, itself
   * included — its symmetry class, as tiles rather than as a name.
   *
   * The group has `4 * columns` elements but a class can be smaller than
   * that, because a tile symmetric under one of them is mapped to itself by
   * it. Summing these sizes over the enumeration is what recovers the
   * unfolded tile count from the folded one.
   */
  variants(tile: Tile): Tile[] {
    const distinct = new Map<string, Tile>();

    for (const variant of this.orbit(tile)) {
      distinct.set(this.edgeKey(variant), variant);
    }

    return [...distinct.values()];
  }
}
