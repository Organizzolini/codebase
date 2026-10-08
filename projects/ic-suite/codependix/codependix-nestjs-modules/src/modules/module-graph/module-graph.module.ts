import { Module } from "@nestjs/common";

import { ModuleGraphService } from "./module-graph.service";

/** Provides the NestJS module import Graph builder and renderer. */
@Module({
  controllers: [],
  exports: [ModuleGraphService],
  imports: [],
  providers: [ModuleGraphService],
})
export class ModuleGraphModule {}
