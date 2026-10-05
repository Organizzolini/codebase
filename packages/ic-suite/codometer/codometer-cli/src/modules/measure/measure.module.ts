import { ConfigurationModule } from "@codometer/configuration";
import { MeasureModule as CodometerMeasureModule } from "@codometer/measurement";
import {
  DeliveryModule,
  DestinationsModule,
  ReportModule,
} from "@codometer/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { MeasureCommand } from "./measure.command";

/**
 * NestJS module that wires the measure command to the layers it composes.
 *
 * Nothing but wiring: the configuration layer reads the command line and the
 * configuration file, the measurement layer counts, and the output layer
 * resolves destinations, builds the report, and delivers it. The command
 * calls them in order and sets an exit code.
 */
@Module({
  controllers: [],
  exports: [MeasureCommand],
  imports: [
    CodometerMeasureModule,
    ConfigurationModule,
    DeliveryModule,
    DestinationsModule,
    LoggerModule,
    ReportModule,
  ],
  providers: [MeasureCommand],
})
export class MeasureModule {}
