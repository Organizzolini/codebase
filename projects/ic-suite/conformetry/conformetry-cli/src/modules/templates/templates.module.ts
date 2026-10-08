import { ConfigurationModule } from "@conformetry/configuration";
import { InventoryModule } from "@conformetry/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { TemplatesCommand } from "./templates.command";

/**
 * Provides the templates command.
 */
@Module({
  controllers: [],
  exports: [TemplatesCommand],
  imports: [ConfigurationModule, InventoryModule, LoggerModule],
  providers: [TemplatesCommand],
})
export class TemplatesModule {}
