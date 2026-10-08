import { Module } from "@nestjs/common";

import { NumeralsService } from "./numerals.service";

/**
 * TODO: Document the numerals module.
 */
@Module({
  controllers: [],
  exports: [NumeralsService],
  imports: [],
  providers: [NumeralsService],
})
export class NumeralsModule {}
