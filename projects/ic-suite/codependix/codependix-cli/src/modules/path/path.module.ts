import { RunContextModule } from "@codependix/boundaries";
import { ConfigurationModule } from "@codependix/configuration";
import { PathQueryModule, ReportingModule } from "@codependix/output";
import { Module } from "@nestjs/common";

import { PathCommand } from "./path.command";

/** Wires the codependix path CLI command together with its collaborators. */
@Module({
  controllers: [],
  exports: [PathCommand],
  imports: [
    ConfigurationModule,
    PathQueryModule,
    ReportingModule,
    RunContextModule,
  ],
  providers: [PathCommand],
})
export class PathModule {}
