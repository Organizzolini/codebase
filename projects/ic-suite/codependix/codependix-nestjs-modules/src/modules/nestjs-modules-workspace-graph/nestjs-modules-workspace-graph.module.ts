import { Module } from "@nestjs/common";

import { NestjsModulesWorkspaceGraphService } from "./nestjs-modules-workspace-graph.service";

/** Provides the whole-workspace NestJS module graph builder. */
@Module({
  controllers: [],
  exports: [NestjsModulesWorkspaceGraphService],
  imports: [],
  providers: [NestjsModulesWorkspaceGraphService],
})
export class NestjsModulesWorkspaceGraphModule {}
