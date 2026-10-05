import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { FileFilterService } from "./file-filter.service";
import { WorkspaceService } from "./workspace.service";

/**
 * Provides project discovery, module identity, and file exclusion.
 */
@Module({
  controllers: [],
  exports: [FileFilterService, WorkspaceService],
  imports: [LoggerModule],
  providers: [FileFilterService, WorkspaceService],
})
export class WorkspaceModule {}
