import { BoundaryCheckModule } from "@codependix/boundaries";
import { Module } from "@nestjs/common";

import { AnchorsModule } from "../anchors/anchors.module";

import { CombinedOutputService } from "./combined-output.service";

/** Provides the combined JSON/Markdown output and `--format` console pass. */
@Module({
  controllers: [],
  exports: [CombinedOutputService],
  imports: [AnchorsModule, BoundaryCheckModule],
  providers: [CombinedOutputService],
})
export class CombinedOutputModule {}
