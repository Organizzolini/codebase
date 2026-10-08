import { ConfigurationModule } from "@codependix/configuration";
import {
  FileImportsWorkspaceGraphModule,
  PythonModule,
  TypescriptModule,
} from "@codependix/file-imports";
import {
  ModuleGraphModule,
  NestjsModulesWorkspaceGraphModule,
  NestjsProjectModule,
} from "@codependix/nestjs-modules";
import { WorkspaceGraphModule } from "@codependix/nx-projects";
import { Module } from "@nestjs/common";

import { DeliveryModule } from "../delivery/delivery.module";

import { WorkspaceGraphsService } from "./workspace-graphs.service";

/** Provides every whole-workspace graph pass: Nx, file-imports, and NestJS modules. */
@Module({
  controllers: [],
  exports: [WorkspaceGraphsService],
  imports: [
    ConfigurationModule,
    DeliveryModule,
    FileImportsWorkspaceGraphModule,
    ModuleGraphModule,
    NestjsModulesWorkspaceGraphModule,
    NestjsProjectModule,
    PythonModule,
    TypescriptModule,
    WorkspaceGraphModule,
  ],
  providers: [WorkspaceGraphsService],
})
export class WorkspaceGraphsModule {}
