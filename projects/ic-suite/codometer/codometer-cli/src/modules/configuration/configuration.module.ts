import { ConfigurationModule as CodometerConfigurationModule } from "@codometer/configuration";
import { ConfigurationListingModule } from "@codometer/output";
import { Module } from "@nestjs/common";

import { ConfigurationCommand } from "./configuration.command";

/**
 * Wires the command that lists what a repository configures.
 *
 * Nothing but wiring. Reading the tree and rendering what it found belong to
 * `@codometer/output`, which is where every other render target already
 * lives; this module hands the command the two it needs.
 */
@Module({
  controllers: [],
  exports: [ConfigurationCommand],
  imports: [CodometerConfigurationModule, ConfigurationListingModule],
  providers: [ConfigurationCommand],
})
export class ConfigurationModule {}
