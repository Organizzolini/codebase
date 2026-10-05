import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { CssService } from "./css.service";

/**
 * NestJS module that provides Css source analysis.
 */
@Module({
  controllers: [],
  exports: [CssService],
  imports: [LoggerModule],
  providers: [CssService],
})
export class CssModule {}
