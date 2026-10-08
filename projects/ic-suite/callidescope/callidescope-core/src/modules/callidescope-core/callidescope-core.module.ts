import { Module } from "@nestjs/common";

import { CallidescopeCoreService } from "./callidescope-core.service";

/**
 * TODO: Document the callidescopeCore module.
 */
@Module({
  controllers: [],
  exports: [CallidescopeCoreService],
  imports: [],
  providers: [CallidescopeCoreService],
})
export class CallidescopeCoreModule {}
