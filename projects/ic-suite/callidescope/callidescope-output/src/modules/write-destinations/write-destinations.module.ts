import { Module } from "@nestjs/common";

import { OutputJsonModule } from "../output-json/output-json.module";
import { OutputMarkdownModule } from "../output-markdown/output-markdown.module";
import { ReportModule } from "../report/report.module";

import { WriteDestinationsService } from "./write-destinations.service";

/**
 * NestJS module that wires the service writing a run to its destinations.
 */
@Module({
  controllers: [],
  exports: [WriteDestinationsService],
  imports: [OutputJsonModule, OutputMarkdownModule, ReportModule],
  providers: [WriteDestinationsService],
})
export class WriteDestinationsModule {}
