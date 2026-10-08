import { ConfigurationModule } from "@conformetry/configuration";
import { InventoryModule } from "@conformetry/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { InstancesCommand } from "./instances.command";

/**
 * Provides the instances command.
 */
@Module({
  controllers: [],
  exports: [InstancesCommand],
  imports: [ConfigurationModule, InventoryModule, LoggerModule],
  providers: [InstancesCommand],
})
export class InstancesModule {}
