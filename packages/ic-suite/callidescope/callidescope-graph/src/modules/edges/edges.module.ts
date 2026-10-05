import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { CallablesModule } from "../callables/callables.module";
import { ClassesModule } from "../classes/classes.module";
import { ProgramModule } from "../program/program.module";
import { WorkspaceModule } from "../workspace/workspace.module";

import { CallSitesService } from "./call-sites.service";
import { EdgesService } from "./edges.service";
import { SymbolResolutionService } from "./symbol-resolution.service";

/**
 * Provides call-site discovery and resolution into call-graph edges.
 */
@Module({
  controllers: [],
  exports: [CallSitesService, EdgesService, SymbolResolutionService],
  imports: [
    CallablesModule,
    ClassesModule,
    LoggerModule,
    ProgramModule,
    WorkspaceModule,
  ],
  providers: [CallSitesService, EdgesService, SymbolResolutionService],
})
export class EdgesModule {}
