import { Module } from "@nestjs/common";

import { AspectsUtilitiesModule } from "../aspects/aspects-utilities.module";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { SpecialtyAspectsEventService } from "./specialty-aspects-event.service";
import { SpecialtyAspectsProgressiveService } from "./specialty-aspects-progressive.service";
import { SpecialtyAspectsService } from "./specialty-aspects.service";

/**
 * NestJS module for specialty (harmonic) aspect event detection.
 * Exports {@link SpecialtyAspectsService} which detects quintile (72°), biquintile (144°),
 * septile (~51.4°), and novile (40°) using narrower orbs than standard aspects.
 */
@Module({
  controllers: [],
  exports: [SpecialtyAspectsService],
  imports: [
    EphemerisModule,
    AspectsUtilitiesModule,
    ProgressiveUtilitiesModule,
  ],
  providers: [
    SpecialtyAspectsEventService,
    SpecialtyAspectsProgressiveService,
    SpecialtyAspectsService,
  ],
})
export class SpecialtyAspectsModule {}
