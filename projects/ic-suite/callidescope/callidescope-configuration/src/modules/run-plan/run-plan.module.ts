import { Module } from "@nestjs/common";

import { FlagResolutionModule } from "../flag-resolution/flag-resolution.module";

import { RunPlanService } from "./run-plan.service";

/**
 * NestJS module that wires how a command line and a configuration resolve into
 * what a run does.
 *
 * Package-internal: `ConfigurationModule` imports it and fronts
 * `RunPlanService` behind `ConfigurationService`, so nothing outside this
 * package wires run planning itself.
 */
@Module({
  controllers: [],
  exports: [RunPlanService],
  imports: [FlagResolutionModule],
  providers: [RunPlanService],
})
export class RunPlanModule {}
