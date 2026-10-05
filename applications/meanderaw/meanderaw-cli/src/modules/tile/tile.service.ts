import { Injectable } from "@nestjs/common";

import { MalformedTileError } from "./tile.constants";

import type {
  Directions,
  Edges,
  EdgesDraft,
  Tile,
  TilePoint,
  TileShape,
} from "./tile.types";

/**
 * The vocabulary every other `mosaic` service reads a tile through: how a
 * tile is built from its edges, how its edges are read back off it, and what
 * makes a grid of direction bits a tile rather than an arbitrary
 * assignment.
 *
 * A tile has two faces and they say the same thing. {@link Edges} is
 * the one whose entries are the tile's own degrees of freedom, one per
 * edge, which is what enumeration iterates and what the symmetry group
 * permutes. {@link Directions} is the one
 * a point is read in, where an edge appears twice because both of its ends
 * carry it. {@link build} goes one way and {@link edges} the other, and a
 * tile that has been through both is the tile it started as.
 *
 * The redundancy is the point rather than the price. Rendering, degree,
 * naming, and the charter's own junction counts are all questions about a
 * *point*, so they are answered by reading four bits rather than by
 * searching for the edges that happen to touch it.
 */
@Injectable()
export class TileService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Refuses one point whose bits disagree with its neighbors'. Split from
   * {@link assertWellFormed} so each stays inside the workspace's statement
   * limit, and called only from it.
   */
  private assertPointAgrees(tile: Tile, row: number, column: number): void {
    const { columns, points } = tile;
    const point = points[row]?.[column];
    const rightward = points[row]?.[(column + 1) % columns];

    if (point === undefined || rightward === undefined) {
      throw new MalformedTileError(`row ${row} is ragged`);
    }

    if (point.east !== rightward.west) {
      throw new MalformedTileError(
        `east at row ${row} column ${column} is not west at the point it reaches`,
      );
    }

    this.assertPointJoinsBelow(point, points[row + 1]?.[column], {
      column,
      row,
    });
  }

  /** Refuses one point whose southward bit the point below does not answer, or whose north is claimed where the cap tick sits. */
  private assertPointJoinsBelow(
    point: Directions,
    below: Directions | undefined,
    at: TilePoint,
  ): void {
    const { column, row } = at;

    if (point.south !== (below?.north ?? false)) {
      throw new MalformedTileError(
        `south at row ${row} column ${column} is not north at the point below it`,
      );
    }

    if (row === 0 && point.north) {
      throw new MalformedTileError(
        "the first row carries no north; the border at y = 0 is a cap tick",
      );
    }
  }

  /** Whether the eastward edge leaving `(row, column)` is set, reading a row or column the tile does not have as unset. */
  private horizontal(edges: Edges, row: number, column: number): boolean {
    return edges.horizontal[row]?.[column] ?? false;
  }

  /** Whether the southward edge leaving `(row, column)` is set. The last interior row has none, so it reads as unset there. */
  private vertical(edges: Edges, row: number, column: number): boolean {
    return edges.vertical[row]?.[column] ?? false;
  }

  // 🌎 Public Methods

  /**
   * Refuses a grid of direction bits that is not a tile, naming what is
   * wrong with it.
   *
   * Three things are checked, and together they are the agreement invariant:
   * the grid is the size its own `rows` and `columns` declare; `east` at
   * every point equals `west` at the point to its right, wrapping from the
   * last column into the next repeat; and `south` equals `north` at the
   * point below, with the rows above the first and below the last
   * carrying neither, since the cap ticks at border lines 0 and `rows + 1` are
   * not tile points.
   *
   * The east–west wrap is what makes a tile tile at all, rather than a
   * detail of that: a tile whose last column disagrees with its own first
   * column draws a pattern that does not join up with its own next repeat.
   */
  assertWellFormed(tile: Tile): void {
    const { columns, points, rows } = tile;

    if (points.length !== rows) {
      throw new MalformedTileError(
        `a ${rows}-row tile has ${rows} rows, not ${points.length}`,
      );
    }

    for (const [row, rowEntries] of points.entries()) {
      if (rowEntries.length !== columns) {
        throw new MalformedTileError(
          `row ${row} spans ${rowEntries.length} columns, not ${columns}`,
        );
      }

      for (const [column] of rowEntries.entries()) {
        this.assertPointAgrees(tile, row, column);
      }
    }
  }

  /** A tile's worth of unset edges, ready to be marked one at a time and handed to {@link build}. */
  blankEdges(shape: TileShape): EdgesDraft {
    const { columns, rows } = shape;
    const grid = (rowCount: number): boolean[][] =>
      Array.from({ length: Math.max(rowCount, 0) }, () =>
        Array.from({ length: columns }, () => false),
      );

    return { horizontal: grid(rows), vertical: grid(rows - 1) };
  }

  /**
   * The tile a set of edges draws, with every point's four bits derived
   * from the two edges it owns and the two its neighbors do.
   *
   * At one column the eastward edge wraps onto its own point, so `east` and
   * `west` there are the same bit by construction — which is why the
   * single-column case needs no rule of its own, and why a shape holds
   * `2^(columns × (2·rows − 1))` tiles at every column span including one.
   */
  build(shape: TileShape, edges: Edges): Tile {
    const { columns, rows } = shape;

    return {
      columns,
      points: Array.from({ length: rows }, (_row, row) =>
        Array.from({ length: columns }, (_column, column) => ({
          east: this.horizontal(edges, row, column),
          north: row > 0 && this.vertical(edges, row - 1, column),
          south: this.vertical(edges, row, column),
          west: this.horizontal(edges, row, (column - 1 + columns) % columns),
        })),
      ),
      rows,
    };
  }

  /**
   * How many of a point's four direction bits are set — the point's degree
   * as the drawing shows it. A dot is 0, a dash end 1, a corner or a
   * straight run 2, a T-junction 3, a crossing 4.
   *
   * At one column a set eastward edge is both the point's `east` and its
   * `west`, so it reads as 2: the ink really does leave that point in both
   * directions, running off one side of the repeat and back in the other.
   */
  degree(directions: Directions): number {
    return [
      directions.east,
      directions.north,
      directions.south,
      directions.west,
    ].filter(Boolean).length;
  }

  /** A tile's edges, each held once, at the point that owns it. */
  edges(tile: Tile): Edges {
    return {
      horizontal: tile.points.map((row) => row.map(({ east }) => east)),
      vertical: tile.points
        .slice(0, -1)
        .map((row) => row.map(({ south }) => south)),
    };
  }

  /**
   * How many distinct edges touch a point, which differs from
   * {@link degree} at one column and nowhere else: there a set eastward
   * edge is a single edge looping from the point back to itself, so it
   * counts once here and twice there.
   *
   * This is the quantity the family's original exact-cover rule bounded at
   * one — every cell claimed exactly once, by a dot alone or by one half of
   * a dash — so it is what a caller asks for to recover that region of the
   * space.
   */
  incidentEdges(tile: Tile, row: number, column: number): number {
    const directions = tile.points[row]?.[column];

    if (directions === undefined) {
      return 0;
    }

    const loops = tile.columns === 1 && directions.east;

    return this.degree(directions) - (loops ? 1 : 0);
  }

  /** Whether a point carries no ink at all, and so draws a dot. */
  isBare(directions: Directions): boolean {
    return this.degree(directions) === 0;
  }

  /** Sets one edge of a draft, ignoring a row the draft does not have — which is what lets a caller walk past the last row without checking first. */
  mark(grid: readonly boolean[][], row: number, column: number): void {
    const targetRow = grid[row];

    if (targetRow !== undefined) {
      targetRow[column] = true;
    }
  }
}
