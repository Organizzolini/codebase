import { PythonModule, TypescriptModule } from "@codependix/file-imports";
import {
  ModuleGraphModule,
  NestjsProjectModule,
} from "@codependix/nestjs-modules";
import {
  NeighborhoodModule,
  WorkspaceGraphModule,
} from "@codependix/nx-projects";
import { Module } from "@nestjs/common";

import { BoundariesModule } from "../boundaries/boundaries.module";

import { BoundaryCheckService } from "./boundary-check.service";
import { BoundaryFailureService } from "./boundary-failure.service";
import { BoundaryGraphService } from "./boundary-graph.service";

/** Wires rule evaluation together with the four graph builders it judges. */
@Module({
  controllers: [],
  exports: [
    BoundariesModule,
    BoundaryCheckService,
    BoundaryFailureService,
    BoundaryGraphService,
  ],
  imports: [
    BoundariesModule,
    ModuleGraphModule,
    NeighborhoodModule,
    NestjsProjectModule,
    PythonModule,
    TypescriptModule,
    WorkspaceGraphModule,
  ],
  providers: [
    BoundaryCheckService,
    BoundaryFailureService,
    BoundaryGraphService,
  ],
})
export class BoundaryCheckModule {}
