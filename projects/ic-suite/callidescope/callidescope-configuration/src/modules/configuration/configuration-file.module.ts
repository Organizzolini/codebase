import { Module } from "@nestjs/common";

import { ConfigurationFileService } from "./configuration-file.service";

/**
 * Provides loading and validation of callidescope configuration files.
 *
 * Package-internal, and deliberately separate from `ConfigurationModule`: run
 * planning needs the loader and the facade needs run planning, so the loader
 * has to be reachable without importing the module that fronts it. Nothing
 * outside this package imports this one.
 */
@Module({
  controllers: [],
  exports: [ConfigurationFileService],
  imports: [],
  providers: [ConfigurationFileService],
})
export class ConfigurationFileModule {}
