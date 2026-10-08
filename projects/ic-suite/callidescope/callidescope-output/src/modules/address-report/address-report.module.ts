import { Module } from "@nestjs/common";

import { ReportModule } from "../report/report.module";

import { AddressReportService } from "./address-report.service";

/**
 * NestJS module that wires `depth` and `breadth`'s terminal rendering.
 */
@Module({
  controllers: [],
  exports: [AddressReportService],
  imports: [ReportModule],
  providers: [AddressReportService],
})
export class AddressReportModule {}
