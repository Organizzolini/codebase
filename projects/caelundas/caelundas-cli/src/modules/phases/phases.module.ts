import { Module } from "@nestjs/common";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathModule } from "../math/math.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { MartianPhaseService } from "./martian-phase.service";
import { MercurianPhaseService } from "./mercurian-phase.service";
import { PhaseCalculationService } from "./phase-calculation.service";
import { PhasesService } from "./phases.service";
import { VenusianPhaseService } from "./venusian-phase.service";

/**
 * NestJS module for inner-planet phase event detection.
 * Exports {@link PhasesService} which identifies Venus, Mercury, and Mars phase events
 * such as maximum elongation, maximum brightness, and morning/evening visibility transitions.
 */
@Module({
  controllers: [],
  exports: [PhasesService],
  imports: [EphemerisModule, MathModule, ProgressiveUtilitiesModule],
  providers: [
    PhaseCalculationService,
    VenusianPhaseService,
    MercurianPhaseService,
    MartianPhaseService,
    PhasesService,
  ],
})
export class PhasesModule {}
