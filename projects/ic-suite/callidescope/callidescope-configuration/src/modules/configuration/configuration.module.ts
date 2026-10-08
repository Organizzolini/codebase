import { Module } from "@nestjs/common";

import { InputModule } from "../input/input.module";
import { RunPlanModule } from "../run-plan/run-plan.module";

import { ConfigurationFileModule } from "./configuration-file.module";
import { ConfigurationService } from "./configuration.service";
import { ProjectConfigurationService } from "./project-configuration.service";

/**
 * Provides the configuration layer's one public service.
 *
 * `ProjectConfigurationService` is provided here, and the three modules above
 * supply the other collaborators `ConfigurationService` is assembled from.
 * None of them is exported: a consumer outside this package injects
 * `ConfigurationService`, which is what makes this layer one entry point
 * rather than four.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [ConfigurationFileModule, InputModule, RunPlanModule],
  providers: [ConfigurationService, ProjectConfigurationService],
})
export class ConfigurationModule {}
