import { Module } from "@nestjs/common";

import { ConfigurationFlagsService } from "./configuration-flags.service";
import { ConfigurationLoaderService } from "./configuration-loader.service";
import { ConfigurationResolverService } from "./configuration-resolver.service";
import { ConfigurationService } from "./configuration.service";

/**
 * Provides the configuration layer's one public service.
 *
 * `ConfigurationLoaderService`, `ConfigurationResolverService` and
 * `ConfigurationFlagsService` are providers rather than exports: they are how
 * `ConfigurationService` finds a file, fills it in, and reads the command line
 * beside it, and nothing outside this package injects any of them.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [],
  providers: [
    ConfigurationFlagsService,
    ConfigurationLoaderService,
    ConfigurationResolverService,
    ConfigurationService,
  ],
})
export class ConfigurationModule {}
