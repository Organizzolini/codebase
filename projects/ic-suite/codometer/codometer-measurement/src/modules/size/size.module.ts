import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { SizeService } from "./size.service";

/**
 * NestJS module that measures the compressed size of a target's files.
 */
@Module({
  controllers: [],
  exports: [SizeService],
  imports: [LoggerModule],
  providers: [SizeService],
})
export class SizeModule {}
