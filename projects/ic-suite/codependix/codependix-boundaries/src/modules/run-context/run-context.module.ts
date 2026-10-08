import { ConfigurationModule } from "@codependix/configuration";
import { NeighborhoodModule } from "@codependix/nx-projects";
import { Module } from "@nestjs/common";

import { RunContextService } from "./run-context.service";

/**
 * Wires run-context resolution to the configuration and project graph it
 * reads, which are the only two things a run has to resolve before any pass
 * can run.
 */
@Module({
  controllers: [],
  exports: [RunContextService],
  imports: [ConfigurationModule, NeighborhoodModule],
  providers: [RunContextService],
})
export class RunContextModule {}
