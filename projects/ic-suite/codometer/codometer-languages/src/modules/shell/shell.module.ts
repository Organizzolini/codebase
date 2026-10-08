import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { ShellService } from "./shell.service";

/**
 * NestJS module that provides Shell source analysis.
 */
@Module({
  controllers: [],
  exports: [ShellService],
  imports: [LoggerModule],
  providers: [ShellService],
})
export class ShellModule {}
