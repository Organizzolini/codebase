import { Module } from "@nestjs/common";

import { SvgService } from "./svg.service";

/**
 * Wires up the service that turns finished path data into an SVG document.
 *
 * It used to wire a second one beside it, deciding the filename a set of
 * generation parameters was written under. That service retired with the
 * `output/<family>/*.svg` tree it named paths in: a meander is a database
 * row now, addressed by its lattice address rather than by a path.
 */
@Module({
  controllers: [],
  exports: [SvgService],
  imports: [],
  providers: [SvgService],
})
export class SvgModule {}
