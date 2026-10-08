import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { TomlService } from "./toml.service";

/**
 * NestJS module that provides Toml source analysis.
 */
@Module({
  controllers: [],
  exports: [TomlService],
  imports: [LoggerModule],
  providers: [TomlService],
})
export class TomlModule {}
