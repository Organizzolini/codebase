import { ConfigurationModule as CodometerConfigurationModule } from "@codometer/configuration";
import { DiscoveryModule } from "@codometer/measurement";
import { Module } from "@nestjs/common";

import { ConfigurationListingService } from "./configuration-listing.service";
import { RenderConfigurationService } from "./render-configuration.service";

/**
 * Renders what a repository configures, as a document rather than a command.
 *
 * Reading the configuration a tree declares is an analysis of configuration,
 * and turning it into a markdown table or a JSON document is a render target
 * like any other — so both live here, above the configuration layer they read
 * and below the command that asks for them. Codometer's own configuration and
 * discovery modules are imported rather than reimplemented: the listing must
 * resolve a file exactly as a measurement would, and must skip the same
 * ignored directories, or it would describe a repository nobody runs.
 */
@Module({
  controllers: [],
  exports: [ConfigurationListingService, RenderConfigurationService],
  imports: [CodometerConfigurationModule, DiscoveryModule],
  providers: [ConfigurationListingService, RenderConfigurationService],
})
export class ConfigurationListingModule {}
