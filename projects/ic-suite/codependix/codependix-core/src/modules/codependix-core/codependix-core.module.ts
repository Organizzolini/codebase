import { Module } from "@nestjs/common";

import { CodependixCoreService } from "./codependix-core.service";

/**
 * TODO: Document the codependixCore module.
 */
@Module({
  controllers: [],
  exports: [CodependixCoreService],
  imports: [],
  providers: [CodependixCoreService],
})
export class CodependixCoreModule {}
