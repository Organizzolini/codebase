import { Module } from "@nestjs/common";

import { HealthResolver } from "./health.resolver";
import { HealthService } from "./health.service";

/**
 * Health check module providing health query resolver.
 */
@Module({
  controllers: [],
  exports: [HealthService],
  imports: [],
  providers: [HealthResolver, HealthService],
})
export class HealthModule {}
