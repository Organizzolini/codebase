import { GraphModule, SignaturesModule } from "@callidescope/graph";
import { Module } from "@nestjs/common";

import { ProjectReportsService } from "./project-reports.service";

/**
 * Provides the per-project view a project's own README is written from.
 */
@Module({
  controllers: [],
  exports: [ProjectReportsService],
  imports: [GraphModule, SignaturesModule],
  providers: [ProjectReportsService],
})
export class ProjectReportsModule {}
