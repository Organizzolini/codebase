import { Module } from "@nestjs/common";

import { NeighborhoodService } from "./neighborhood.service";

/** Provides the Nx one-hop dependency neighborhood builder. */
@Module({
  controllers: [],
  exports: [NeighborhoodService],
  imports: [],
  providers: [NeighborhoodService],
})
export class NeighborhoodModule {}
