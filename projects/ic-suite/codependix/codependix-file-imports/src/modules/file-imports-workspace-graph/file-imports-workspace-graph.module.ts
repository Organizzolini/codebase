import { Module } from "@nestjs/common";

import { FileImportsWorkspaceGraphService } from "./file-imports-workspace-graph.service";

/** Provides the whole-workspace file-level import graph builder. */
@Module({
  controllers: [],
  exports: [FileImportsWorkspaceGraphService],
  imports: [],
  providers: [FileImportsWorkspaceGraphService],
})
export class FileImportsWorkspaceGraphModule {}
