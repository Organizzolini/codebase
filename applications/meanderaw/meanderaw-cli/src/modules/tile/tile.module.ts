import { Module } from "@nestjs/common";

import { TileService } from "./tile.service";

/**
 * Wires up the tile vocabulary every other service reads a tile through:
 * how a tile is built from its edges, how its edges are read back off it,
 * and what makes a grid of direction bits a tile rather than an arbitrary
 * assignment.
 *
 * It imports nothing, and that is the point of it. The symmetry group, the
 * walk over a shape's tiles, the Code a tile spells, and the drawing one
 * renders to all depend on this module; it depends on none of them, so the
 * vocabulary stays sayable wherever a tile is.
 */
@Module({
  controllers: [],
  exports: [TileService],
  imports: [],
  providers: [TileService],
})
export class TileModule {}
