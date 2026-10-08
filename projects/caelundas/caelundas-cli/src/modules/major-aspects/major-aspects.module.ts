import { Module } from "@nestjs/common";

import { AspectsUtilitiesModule } from "../aspects/aspects-utilities.module";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { MajorAspectEventService } from "./major-aspect-event.service";
import { MajorAspectProgressiveService } from "./major-aspect-progressive.service";
import { MajorAspectsService } from "./major-aspects.service";

/**
 * NestJS module for major aspect event detection.
 * Exports {@link MajorAspectsService} which detects conjunction (0°), sextile (60°),
 * square (90°), trine (120°), and opposition (180°) using an 8° orb tolerance.
 */
@Module({
  controllers: [],
  exports: [MajorAspectsService],
  imports: [
    EphemerisModule,
    AspectsUtilitiesModule,
    ProgressiveUtilitiesModule,
  ],
  providers: [
    MajorAspectEventService,
    MajorAspectProgressiveService,
    MajorAspectsService,
  ],
})
export class MajorAspectsModule {}
