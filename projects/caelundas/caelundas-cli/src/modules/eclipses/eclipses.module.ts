import { Module } from "@nestjs/common";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathModule } from "../math/math.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { EclipseCalculationService } from "./eclipse-calculation.service";
import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";
import { EclipsesService } from "./eclipses.service";

/**
 * NestJS module for solar and lunar eclipse event detection.
 * Exports {@link EclipsesService} which identifies eclipse phases (beginning, maximum, ending)
 * in both geocentric and topocentric reference frames.
 */
@Module({
  controllers: [],
  exports: [EclipsesService],
  imports: [EphemerisModule, MathModule, ProgressiveUtilitiesModule],
  providers: [
    EclipseEventService,
    EclipseGeometryService,
    EclipseTopocentricService,
    EclipseCalculationService,
    EclipsesService,
  ],
})
export class EclipsesModule {}
