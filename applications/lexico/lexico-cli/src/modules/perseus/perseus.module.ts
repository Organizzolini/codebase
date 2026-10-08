import { Module } from "@nestjs/common";

import { PerseusCommand } from "./perseus.command";

/**
 * TODO: Document the perseus module.
 */
@Module({
  controllers: [],
  exports: [PerseusCommand],
  imports: [],
  providers: [PerseusCommand],
})
export class PerseusModule {}
