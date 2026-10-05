import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { AnnualSolarCycleModule } from "../annual-solar-cycle/annual-solar-cycle.module";
import { AspectsModule } from "../aspects/aspects.module";
import { CalendarModule } from "../calendar/calendar.module";
import { DailyCyclesModule } from "../daily-cycles/daily-cycles.module";
import { EclipsesModule } from "../eclipses/eclipses.module";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { IngressesModule } from "../ingresses/ingresses.module";
import { InputModule } from "../input/input.module";
import { MajorAspectsModule } from "../major-aspects/major-aspects.module";
import { MathModule } from "../math/math.module";
import { MinorAspectsModule } from "../minor-aspects/minor-aspects.module";
import { MonthlyLunarCycleModule } from "../monthly-lunar-cycle/monthly-lunar-cycle.module";
import { PerfectiveModule } from "../perfective/perfective.module";
import { PhasesModule } from "../phases/phases.module";
import { ProgressiveModule } from "../progressive/progressive.module";
import { QuadrupleAspectsModule } from "../quadruple-aspects/quadruple-aspects.module";
import { QuintupleAspectsModule } from "../quintuple-aspects/quintuple-aspects.module";
import { RetrogradesModule } from "../retrogrades/retrogrades.module";
import { SextupleAspectsModule } from "../sextuple-aspects/sextuple-aspects.module";
import { SpecialtyAspectsModule } from "../specialty-aspects/specialty-aspects.module";
import { StelliumModule } from "../stellium/stellium.module";
import { TripleAspectsModule } from "../triple-aspects/triple-aspects.module";
import { TwilightsModule } from "../twilights/twilights.module";

import { CaelundasCommand } from "./caelundas.command";

/**
 * Root NestJS application module.
 *
 * Imports all domain modules and the global config module so that every
 * service can read environment variables via {@link ConfigService}.
 */
@Module({
  controllers: [],
  exports: [CaelundasCommand],
  imports: [
    LoggerModule,
    InputModule,
    MathModule,
    EphemerisModule,
    CalendarModule,
    AspectsModule,
    MajorAspectsModule,
    MinorAspectsModule,
    TripleAspectsModule,
    QuadrupleAspectsModule,
    QuintupleAspectsModule,
    SextupleAspectsModule,
    SpecialtyAspectsModule,
    StelliumModule,
    EclipsesModule,
    RetrogradesModule,
    IngressesModule,
    DailyCyclesModule,
    MonthlyLunarCycleModule,
    AnnualSolarCycleModule,
    TwilightsModule,
    PhasesModule,
    PerfectiveModule,
    ProgressiveModule,
  ],
  providers: [CaelundasCommand],
})
export class CaelundasModule {}
