import { NeighborhoodModule } from "@codependix/nx-projects";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { ProjectGraphsModule } from "../project-graphs/project-graphs.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";
import { WorkspaceGraphsModule } from "../workspace-graphs/workspace-graphs.module";

import { GraphRunService } from "./graph-run.service";

/** Wires every graph-type export pass together behind one orchestrator. */
@Module({
  controllers: [],
  exports: [GraphRunService],
  imports: [
    LoggerModule,
    NeighborhoodModule,
    ProjectGraphsModule,
    PythonImportsModule,
    WorkspaceGraphsModule,
  ],
  providers: [GraphRunService],
})
export class GraphRunModule {}
