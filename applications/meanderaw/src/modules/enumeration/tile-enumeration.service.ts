import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { EDGE_BUDGET, OversizedTileError } from "./enumeration.constants";

import type { EdgesDraft, Tile, TileShape } from "../tile/tile.types";
import type { EdgeAddress, Environment } from "./enumeration.types";

/**
 * Enumerates every distinct `mosaic` tile at a given size.
 *
 * A tile's degrees of freedom are its edges and nothing else: one eastward
 * edge and one southward edge per point, minus the last row's southward
 * ones, which have nowhere to reach. So the space at one shape is every
 * subset of them — `2^(columns * (2 * rows - 1))` in all — and enumerating
 * it is deciding each edge in turn rather than searching for an
 * arrangement, which is what makes the walk indifferent to what the tiles
 * mean.
 *
 * One number bounds it. `SWEEP_EDGE_BUDGET` — read through
 * {@link ConfigService}, defaulting to `EDGE_BUDGET` — is a ceiling on the
 * whole *tile*: how many edges it may hold, which is what keeps the space
 * small enough to look through, since the count is `2 ** edges` before
 * folding. There was once a second, a ceiling on how many direction bits one
 * *point* could carry, and it is gone: a point may carry any of the sixteen
 * patterns, junctions and crossings included, so the budget is the only
 * thing bounding the space and it has to be.
 *
 * The result is folded by symmetry class — a tile
 * repeats forever, so a shift or a mirror of one tile is not another — and
 * `SymmetryService.canonicalTile` picks which member of a class the
 * corpus draws. Which member the walk happens to reach first therefore does
 * not matter.
 *
 * Nothing here knows what a tile is called. The fold is keyed on
 * `SymmetryService.edgeKey`, so the naming this family's filenames use
 * can depend on this module without this module depending back on it.
 */
@Injectable()
export class TileEnumerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SymmetryService)
    private readonly symmetryService: SymmetryService,
    @Inject(TileService)
    private readonly tileService: TileService,
    @Inject(ConfigService)
    configService: ConfigService<Environment>,
  ) {
    this.edgeBudget =
      configService.get<number>("SWEEP_EDGE_BUDGET") ?? EDGE_BUDGET;
  }

  // 🔐 Private Fields

  /**
   * How many edges one tile may hold, read once from `SWEEP_EDGE_BUDGET` at
   * construction — startup validates the schema, so a malformed or
   * out-of-range budget never reaches a running sweep.
   */
  private readonly edgeBudget: number;

  /**
   * Every shape already enumerated, keyed by `rows x columns`.
   *
   * Enumeration is a pure function of a shape and walks `2 ** edges`
   * assignments, so at the budget's largest shapes it is 32,768 of them —
   * and the sweep, the charter measurement, and several tests each ask for
   * the same shapes more than once. Keeping the answer is what makes asking
   * again free.
   */
  private readonly tilesByShape = new Map<string, Tile[]>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Where the `ordinal`-th edge sits in a draft: the grid that holds it, and its row and column within that grid. */
  private address(
    edges: EdgesDraft,
    shape: TileShape,
    ordinal: number,
  ): EdgeAddress {
    const { columns, rows } = shape;
    const horizontalCount = columns * rows;
    const isHorizontal = ordinal < horizontalCount;
    const local = isHorizontal ? ordinal : ordinal - horizontalCount;

    return {
      column: local % columns,
      grid: isHorizontal ? edges.horizontal : edges.vertical,
      row: Math.floor(local / columns),
    };
  }

  /**
   * One permutation of a shape's edges as byte lookup tables: entry `value`
   * of table `byte` is where the bits of `value`, read as edges `8 * byte`
   * through `8 * byte + 7`, land under the permutation.
   *
   * A bitmask's image is then one lookup per byte rather than one move per
   * edge, which is the difference between the walk costing a few
   * nanoseconds per element of the group and costing a tile.
   */
  private byteTables(permutation: readonly number[]): Uint32Array[] {
    return Array.from(
      { length: Math.ceil(permutation.length / 8) },
      (_table, byte) =>
        Uint32Array.from({ length: 256 }, (_entry, value) => {
          let image = 0;

          for (let bit = 0; bit < 8; bit += 1) {
            const target = permutation[byte * 8 + bit];

            if (target !== undefined && (value >>> bit) & 1) {
              image |= 1 << target;
            }
          }

          return image >>> 0;
        }),
    );
  }

  /** Where `mask` lands under the permutation `tables` were built from. */
  private image(tables: readonly Uint32Array[], mask: number): number {
    let image = 0;

    for (const [byte, table] of tables.entries()) {
      image |= table[(mask >>> (byte * 8)) & 255] ?? 0;
    }

    return image >>> 0;
  }

  /** Sets the `ordinal`-th edge of a draft. */
  private set(edges: EdgesDraft, shape: TileShape, ordinal: number): void {
    const { column, grid, row } = this.address(edges, shape, ordinal);

    this.tileService.mark(grid, row, column);
  }

  // 🌎 Public Methods

  /**
   * How many edges a tile of this shape holds, which is both how many binary
   * decisions one tile is and what the configured edge budget bounds.
   */
  edges(shape: TileShape): number {
    return shape.columns * (2 * shape.rows - 1);
  }

  /**
   * Every distinct tile of the given size, one per symmetry class, ordered
   * by canonical edge key so the sweep is stable across runs.
   *
   * A shape the budget does not admit is refused rather than enumerated
   * slowly: the walk is `2 ** edges` wide, so one shape too many is not a
   * long run but an unfinished one.
   */
  enumerate(rows: number, columns: number): Tile[] {
    const shape: TileShape = { columns, rows };

    if (!this.isAdmitted(shape)) {
      throw new OversizedTileError(shape, this.edges(shape), this.edgeBudget);
    }

    const cached = this.tilesByShape.get(`${rows}x${columns}`);

    if (cached !== undefined) {
      return [...cached];
    }

    const tiles = this.orbitMinima(rows, columns)
      .map((mask) => {
        const tile = this.symmetryService.canonicalTile(this.tile(shape, mask));

        return { key: this.symmetryService.edgeKey(tile), tile };
      })
      .toSorted((first, second) => first.key.localeCompare(second.key))
      .map(({ tile }) => tile);

    this.tilesByShape.set(`${rows}x${columns}`, tiles);

    return [...tiles];
  }

  /** Whether a shape is small enough to enumerate, which is the only thing that decides it. */
  isAdmitted(shape: TileShape): boolean {
    return this.edges(shape) <= this.edgeBudget;
  }

  /**
   * Whether every point of a tile is touched by at most one edge — the
   * family's original exact-cover rule, restated over the lattice.
   *
   * Each point claimed exactly once, by a dot on its own or by one half of a
   * dash, is exactly a matching: no two edges meet. The single-column
   * wrapped edge counts as the one edge it is, which is why the continuous
   * rule `lines` draws sits inside this region rather than outside it, even
   * though the ink really does leave that point in both directions.
   *
   * Nothing in the enumeration reads this. The ceiling on a point is on its
   * direction bits now, and this region is strictly inside that one — so it
   * is kept, and asserted shape by shape against the counts the old rule
   * produced, because reproducing that set exactly is what says the wider
   * space *contains* the narrower one rather than replacing it.
   */
  isMatching(tile: Tile): boolean {
    for (const [row, pointsRow] of tile.points.entries()) {
      for (const [column] of pointsRow.entries()) {
        if (this.tileService.incidentEdges(tile, row, column) > 1) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * The widest column span the budget admits at a row count, which is at
   * least one at every row count the family draws in.
   *
   * The sweep asks per row rather than reading a column cap, which is what
   * makes the budget the single knob: five columns at two rows, one at
   * five, and the arithmetic between them says so rather than a table.
   */
  maximumColumns(rows: number): number {
    return Math.max(Math.floor(this.edgeBudget / (2 * rows - 1)), 1);
  }

  /**
   * Every assignment of a shape's edges that no element of the symmetry
   * group sends to a smaller one, as bitmasks — exactly one per symmetry
   * class, in ascending order.
   *
   * Bit `ordinal` of a mask is edge `ordinal` in {@link edges} order. A
   * class's smallest member is a choice rather than a fact, like its
   * representative, but it is one a walk can make without building the
   * class: each element of the group is applied to the mask as a few byte
   * lookups, and the walk moves on at the first image smaller than the mask
   * itself. Every other member of the class is never built, which is what
   * the walk it replaced spent nearly all its time on.
   *
   * A shape the budget does not admit is refused, as {@link enumerate}
   * refuses it. Bit operations are 32 bits wide, which no admitted shape
   * comes near: a 32-edge walk is four billion assignments.
   */
  orbitMinima(rows: number, columns: number): number[] {
    const shape: TileShape = { columns, rows };
    const edges = this.edges(shape);

    if (!this.isAdmitted(shape) || edges > 32) {
      throw new OversizedTileError(shape, edges, this.edgeBudget);
    }

    const group = this.symmetryService
      .edgePermutations(shape)
      .slice(1)
      .map((permutation) => this.byteTables(permutation));
    const minima: number[] = [];

    for (let mask = 0; mask < 2 ** edges; mask += 1) {
      if (group.every((tables) => this.image(tables, mask) >= mask)) {
        minima.push(mask);
      }
    }

    return minima;
  }

  /**
   * The tile a bitmask describes, edge `ordinal` set wherever bit `ordinal`
   * is — not folded to its class's representative, which
   * `SymmetryService.canonicalTile` does.
   */
  tile(shape: TileShape, mask: number): Tile {
    const edges = this.tileService.blankEdges(shape);

    for (let ordinal = 0; ordinal < this.edges(shape); ordinal += 1) {
      if ((mask >>> ordinal) & 1) {
        this.set(edges, shape, ordinal);
      }
    }

    return this.tileService.build(shape, edges);
  }
}
