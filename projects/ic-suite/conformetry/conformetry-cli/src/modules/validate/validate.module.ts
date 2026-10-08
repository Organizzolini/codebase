import { ConfigurationModule } from "@conformetry/configuration";
import { ReportingModule } from "@conformetry/output";
import { ValidationModule } from "@conformetry/validation";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { ValidateCommand } from "./validate.command";

/**
 * Provides the validate command.
 */
@Module({
  controllers: [],
  exports: [ValidateCommand],
  imports: [
    ConfigurationModule,
    LoggerModule,
    ReportingModule,
    ValidationModule,
  ],
  providers: [ValidateCommand],
})
export class ValidateModule {}
