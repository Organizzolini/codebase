import { Module } from "@nestjs/common";

import { FlagResolutionService } from "./flag-resolution.service";

/**
 * Provides the one resolver every callidescope command line is merged with a
 * configuration through.
 */
@Module({
  controllers: [],
  exports: [FlagResolutionService],
  imports: [],
  providers: [FlagResolutionService],
})
export class FlagResolutionModule {}
