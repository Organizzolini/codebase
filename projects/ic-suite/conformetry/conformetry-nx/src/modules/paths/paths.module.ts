import { ConfigurationModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { InstancesModule } from "../instances/instances.module";
import { ScopeModule } from "../scope/scope.module";

import { PathsService } from "./paths.service";

/**
 * Provides discovery of where a generator writes.
 *
 * Depends on the instances module rather than globbing again, so the module
 * folders generation places code beside are exactly the ones validation
 * checks — the two cannot disagree about what a module is.
 */
@Module({
  controllers: [],
  exports: [InstancesModule, ConfigurationModule, PathsService, ScopeModule],
  imports: [InstancesModule, ConfigurationModule, ScopeModule],
  providers: [PathsService],
})
export class PathsModule {}
