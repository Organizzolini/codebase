import { ConfigurationModule } from "@callidescope/configuration";
import { WorkspaceModule } from "@callidescope/graph";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { LimitsCommand } from "./limits.command";
import { LimitsService } from "./limits.service";
import { RenderLimitsService } from "./render-limits.service";

/**
 * NestJS module that wires the `limits` command.
 *
 * Imports callidescope's own configuration and workspace modules rather than
 * reimplementing either: the listing has to find the same projects a trace
 * finds, skip the same excluded ones, and resolve each project's limits
 * through the one resolver a gate reads — or it would describe a run nobody
 * makes.
 */
@Module({
  controllers: [],
  exports: [LimitsCommand, LimitsService],
  imports: [ConfigurationModule, LoggerModule, WorkspaceModule],
  providers: [LimitsCommand, LimitsService, RenderLimitsService],
})
export class LimitsModule {}
