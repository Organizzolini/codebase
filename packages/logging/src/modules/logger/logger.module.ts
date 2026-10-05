import { Global, Module } from "@nestjs/common";

import { LoggerService } from "./logger.service";

/**
 * Global logger module — import once in the root module and
 * `LoggerService` becomes injectable everywhere without
 * needing to add this module to individual feature module imports.
 */
@Global()
@Module({
  controllers: [],
  exports: [LoggerService],
  imports: [],
  providers: [LoggerService],
})
export class LoggerModule {}
