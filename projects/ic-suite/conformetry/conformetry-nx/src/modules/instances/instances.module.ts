import { ConfigurationModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { ScopeModule } from "../scope/scope.module";

import { InstancesService } from "./instances.service";

/**
 * Provides Nx-aware expansion of the configured instance globs.
 *
 * Imports the generic discovery module rather than globbing here, so the
 * plugin and the CLI resolve instances by exactly the same rules.
 */
@Module({
  controllers: [],
  exports: [InstancesService, ScopeModule],
  imports: [ConfigurationModule, ScopeModule],
  providers: [InstancesService],
})
export class InstancesModule {}
