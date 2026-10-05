import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { PythonService } from "./python.service";

/**
 * NestJS module that provides Python code analysis.
 */
@Module({
  controllers: [],
  exports: [PythonService],
  imports: [LoggerModule],
  providers: [PythonService],
})
export class PythonModule {}
