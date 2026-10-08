import { ScoringModule } from "@conformetry/languages";
import { Module } from "@nestjs/common";

import { ReportingService } from "./reporting.service";

/**
 * Owns rendering of structured conformance differences into readable text.
 *
 * Imported by `conformetry-validation` and by the CLI, so that a validation
 * run reports identically no matter which surface invoked it.
 */
@Module({
  controllers: [],
  exports: [ReportingService],
  imports: [ScoringModule],
  providers: [ReportingService],
})
export class ReportingModule {}
