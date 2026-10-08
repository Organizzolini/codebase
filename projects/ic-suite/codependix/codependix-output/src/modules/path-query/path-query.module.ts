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

import { PathQueryService } from "./path-query.service";

/** Provides path query and rendering services across graph levels. */
@Module({
  controllers: [],
  exports: [PathQueryService],
  imports: [
    FileImportsWorkspaceGraphModule,
    ModuleGraphModule,
    NestjsModulesWorkspaceGraphModule,
    NestjsProjectModule,
    PythonModule,
    TypescriptModule,
    WorkspaceGraphModule,
  ],
  providers: [PathQueryService],
})
export class PathQueryModule {}
