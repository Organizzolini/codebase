import { Module } from "@nestjs/common";

import { BoundariesService } from "./boundaries.service";
import { BoundaryCyclesService } from "./boundary-cycles.service";
import { BoundaryReportService } from "./boundary-report.service";
import { BoundarySelectorService } from "./boundary-selector.service";

/** Wires rule evaluation together with selection, cycle finding, and reporting. */
@Module({
  controllers: [],
  exports: [
    BoundariesService,
    BoundaryCyclesService,
    BoundaryReportService,
    BoundarySelectorService,
  ],
  imports: [],
  providers: [
    BoundariesService,
    BoundaryCyclesService,
    BoundaryReportService,
    BoundarySelectorService,
  ],
})
export class BoundariesModule {}
