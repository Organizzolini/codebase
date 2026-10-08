import { Module } from "@nestjs/common";

import { EntitiesService } from "./entities.service";

/**
 * TODO: Document the entities module.
 */
@Module({
  controllers: [],
  exports: [EntitiesService],
  imports: [],
  providers: [EntitiesService],
})
export class EntitiesModule {}
