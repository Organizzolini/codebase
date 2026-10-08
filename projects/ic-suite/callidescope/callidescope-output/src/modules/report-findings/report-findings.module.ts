import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { ReportFindingsService } from "./report-findings.service";

/**
 * NestJS module that wires the service weighing a trace's findings.
 */
@Module({
  controllers: [],
  exports: [ReportFindingsService],
  imports: [LoggerModule],
  providers: [ReportFindingsService],
})
export class ReportFindingsModule {}
