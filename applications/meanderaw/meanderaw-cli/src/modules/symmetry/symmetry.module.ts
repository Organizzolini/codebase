import { Module } from "@nestjs/common";

import { TileModule } from "../tile/tile.module";

import { SymmetryService } from "./symmetry.service";

/**
 * Wires up the symmetry group two tiles are the same drawing under, and the
 * tile-shaped operations that act under it.
 *
 * It imports {@link TileModule} for the vocabulary a transform is expressed
 * in — a tile's edges are where its degrees of freedom are, and the group
 * acts on those rather than on its points. Nothing flows back: the group is
 * a fact about the lattice, and the vocabulary knows nothing of it.
 */
@Module({
  controllers: [],
  exports: [SymmetryService],
  imports: [TileModule],
  providers: [SymmetryService],
})
export class SymmetryModule {}
