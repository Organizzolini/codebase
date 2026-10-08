import { Module } from "@nestjs/common";

import { ConformetryCoreService } from "./conformetry-core.service";

/**
 * TODO: Document the conformetryCore module.
 */
@Module({
  controllers: [],
  exports: [ConformetryCoreService],
  imports: [],
  providers: [ConformetryCoreService],
})
export class ConformetryCoreModule {}
