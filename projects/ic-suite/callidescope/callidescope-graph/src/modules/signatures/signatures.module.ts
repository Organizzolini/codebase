import { Module } from "@nestjs/common";

import { SignaturesService } from "./signatures.service";

/**
 * Provides the parameters and return type a report prints beside a frame.
 */
@Module({
  controllers: [],
  exports: [SignaturesService],
  imports: [],
  providers: [SignaturesService],
})
export class SignaturesModule {}
