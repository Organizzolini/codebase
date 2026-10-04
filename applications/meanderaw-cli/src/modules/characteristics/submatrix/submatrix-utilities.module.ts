import { Module } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "./submatrix-utilities.service";

/**
 * Provides and exports the one stateless `SubmatrixUtilitiesService` every
 * submatrix group reads points and glyph templates through, so the corner,
 * cross, embedded, fork, letter, point, and rectangle groups import a single
 * shared instance rather than each providing its own.
 */
@Module({
  controllers: [],
  exports: [SubmatrixUtilitiesService],
  imports: [],
  providers: [SubmatrixUtilitiesService],
})
export class SubmatrixUtilitiesModule {}
