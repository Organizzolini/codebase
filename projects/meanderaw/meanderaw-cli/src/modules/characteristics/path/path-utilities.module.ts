import { Module } from "@nestjs/common";

import { PathUtilitiesService } from "./path-utilities.service";

/**
 * Provides and exports the one stateless `PathUtilitiesService` the path
 * groups read strands and row touches through, so any path group imports a
 * single shared instance rather than providing its own.
 */
@Module({
  controllers: [],
  exports: [PathUtilitiesService],
  imports: [],
  providers: [PathUtilitiesService],
})
export class PathUtilitiesModule {}
