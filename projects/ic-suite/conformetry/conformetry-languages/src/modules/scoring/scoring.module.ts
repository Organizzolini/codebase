import { Module } from "@nestjs/common";

import { ScoringService } from "./scoring.service";

/**
 * Owns the conformance arithmetic every validator and host would otherwise
 * repeat: what a finding weighs, and what a weight pair scores.
 */
@Module({
  controllers: [],
  exports: [ScoringService],
  imports: [],
  providers: [ScoringService],
})
export class ScoringModule {}
