import { Module } from "@nestjs/common";

import { GeometryService } from "./geometry.service";

/**
 * Wires up the shared scaling rule every motif module resolves its pixel
 * coordinates through. Depends on nothing else in the project, which is what
 * lets every motif module import it without pulling in a motif.
 */
@Module({
  controllers: [],
  exports: [GeometryService],
  imports: [],
  providers: [GeometryService],
})
export class GeometryModule {}
