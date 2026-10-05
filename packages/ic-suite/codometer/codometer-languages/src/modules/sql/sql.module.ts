import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { SqlService } from "./sql.service";

/**
 * NestJS module that provides Sql source analysis.
 */
@Module({
  controllers: [],
  exports: [SqlService],
  imports: [LoggerModule],
  providers: [SqlService],
})
export class SqlModule {}
