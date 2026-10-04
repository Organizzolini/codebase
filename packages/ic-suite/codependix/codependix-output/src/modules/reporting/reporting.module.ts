import { BoundaryCheckModule } from "@codependix/boundaries";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ReportingService } from "./reporting.service";

/** Provides `MapCommand`'s findings-logging and pass/fail-weighing pass. */
@Module({
  controllers: [],
  exports: [ReportingService],
  imports: [BoundaryCheckModule, LoggerModule],
  providers: [ReportingService],
})
export class ReportingModule {}
