import { Module } from "@nestjs/common";

import { EtymologyService } from "./etymology.service";

/**
 * TODO: Document the etymology module.
 */
@Module({
  controllers: [],
  exports: [EtymologyService],
  imports: [],
  providers: [EtymologyService],
})
export class EtymologyModule {}
