import { Module } from "@nestjs/common";

import { NeighborhoodModule } from "../neighborhood/neighborhood.module";

import { WorkspaceGraphService } from "./workspace-graph.service";

/** Provides the whole-workspace Nx dependency graph builder. */
@Module({
  controllers: [],
  exports: [WorkspaceGraphService],
  imports: [NeighborhoodModule],
  providers: [WorkspaceGraphService],
})
export class WorkspaceGraphModule {}
