import { Module } from "@nestjs/common";

import { MacronsService } from "./macrons.service";

/**
 * Macrons module owning how Latin vowel-length marks are handled.
 */
@Module({
  controllers: [],
  exports: [MacronsService],
  imports: [],
  providers: [MacronsService],
})
export class MacronsModule {}
