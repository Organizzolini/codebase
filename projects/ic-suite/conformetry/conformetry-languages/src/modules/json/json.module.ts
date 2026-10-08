import { Module } from "@nestjs/common";

import { ScoringModule } from "../scoring/scoring.module";

import { JsonComparisonService } from "./json-comparison.service";
import { JsonService } from "./json.service";

/**
 * Provides the JSON language validator.
 *
 * `JsonComparisonService` is exported as well, because notebooks are JSON
 * documents and the Jupyter module reuses the same structural walk.
 */
@Module({
  controllers: [],
  exports: [JsonComparisonService, JsonService],
  imports: [ScoringModule],
  providers: [JsonComparisonService, JsonService],
})
export class JsonModule {}
