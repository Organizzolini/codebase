import { ConfigurationModule } from "@conformetry/configuration";
import { GenerationModule } from "@conformetry/generation";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { GenerateCommand } from "./generate.command";

/**
 * Provides the generate command.
 */
@Module({
  controllers: [],
  exports: [GenerateCommand],
  imports: [ConfigurationModule, GenerationModule, LoggerModule],
  providers: [GenerateCommand],
})
export class GenerateModule {}
