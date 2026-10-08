import { Module } from "@nestjs/common";

import { InputModule } from "../input/input.module";
import { OverrideResolutionModule } from "../override-resolution/override-resolution.module";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import { ConfigurationService } from "./configuration.service";
import { FlagResolutionService } from "./flag-resolution.service";

/**
 * Provides everything one run is configured by: the configuration file, the
 * command line resolved over it, and each project's own resolved output.
 *
 * `ConfigurationService` is the only thing this module exports, and the only
 * service `@codependix/configuration` makes public. File loading, override
 * resolution, option parsing, and run-mode selection are providers here
 * rather than modules of their own, so a caller asking what a run is
 * configured to do has exactly one place to ask.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [InputModule, OverrideResolutionModule],
  providers: [
    ConfigurationLoaderService,
    ConfigurationService,
    FlagResolutionService,
  ],
})
export class ConfigurationModule {}
