import { ConfigurationModule } from "@codometer/configuration";
import { LanguagesModule } from "@codometer/languages";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logging";

import { CustomizationModule } from "../customization/customization.module";
import { DiscoveryModule } from "../discovery/discovery.module";
import { InputsModule } from "../inputs/inputs.module";
import { LimitsModule } from "../limits/limits.module";
import { SizeModule } from "../size/size.module";

import { MeasureService } from "./measure.service";

/**
 * Wires every analyzer a measurement run joins, and the service that joins
 * them.
 *
 * The one module a host has to import to measure anything: discovery finds the
 * files, the language and size analyzers count them, the custom counters add
 * whatever a configuration declared, and the limits layer holds the result to
 * what the configuration gates. None of the five imports another, which is why
 * the join lives here rather than inside one of them.
 */
@Module({
  controllers: [],
  exports: [MeasureService],
  imports: [
    ConfigurationModule,
    CustomizationModule,
    DiscoveryModule,
    InputsModule,
    LanguagesModule,
    LimitsModule,
    LoggerModule,
    SizeModule,
  ],
  providers: [MeasureService],
})
export class MeasureModule {}
