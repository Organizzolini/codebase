import { Module } from "@nestjs/common";

import { LimitsService } from "./limits.service";
import { MetricIndexService } from "./metric-index.service";

/**
 * NestJS module that holds measured metrics to their declared limits.
 */
@Module({
  controllers: [],
  exports: [LimitsService, MetricIndexService],
  imports: [],
  providers: [LimitsService, MetricIndexService],
})
export class LimitsModule {}
