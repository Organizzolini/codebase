import { Module } from "@nestjs/common";

import { ReportService } from "./report.service";

/**
 * NestJS module that renders a measurement as codometer's own report.
 */
@Module({
  controllers: [],
  exports: [ReportService],
  imports: [],
  providers: [ReportService],
})
export class ReportModule {}
