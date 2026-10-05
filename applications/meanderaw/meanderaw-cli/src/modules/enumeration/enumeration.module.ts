import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { SymmetryModule } from "../symmetry/symmetry.module";
import { TileModule } from "../tile/tile.module";

import { EnumerationService } from "./enumeration.service";
import { TileEnumerationService } from "./tile-enumeration.service";

/**
 * Wires up the walk over the lattice's own unit space, at each of the two
 * scales it is asked for.
 *
 * {@link TileEnumerationService} walks every subset of a shape's edges and
 * folds the result by symmetry class, so what comes back is one tile per
 * distinct drawing. {@link EnumerationService} sits above it, spelling each
 * of those tiles into a Code and deciding which shapes are worth walking at
 * all.
 *
 * Nothing here knows what a tile is called: the fold is keyed on
 * `SymmetryService.edgeKey`, which is the tile's own degrees of freedom with
 * nothing counted twice. That is what lets {@link CodeModule} depend on the
 * symmetry group without this module depending back on the spelling.
 */
@Module({
  controllers: [],
  exports: [EnumerationService, TileEnumerationService],
  imports: [CodeModule, SymmetryModule, TileModule],
  providers: [EnumerationService, TileEnumerationService],
})
export class EnumerationModule {}
