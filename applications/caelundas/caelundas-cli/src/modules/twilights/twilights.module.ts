import { Module } from "@nestjs/common";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathModule } from "../math/math.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { TwilightsBuilderService } from "./twilights-builder.service";
import { TwilightsComposerService } from "./twilights-composer.service";
import { TwilightsDetectorService } from "./twilights-detector.service";
import { TwilightsService } from "./twilights.service";

/**
 * NestJS module for solar twilight event detection.
 * Exports {@link TwilightsService} which identifies astronomical, nautical, and civil
 * dawn and dusk transitions based on solar depression angles.
 */
@Module({
  controllers: [],
  exports: [TwilightsService],
  imports: [EphemerisModule, MathModule, ProgressiveUtilitiesModule],
  providers: [
    TwilightsBuilderService,
    TwilightsComposerService,
    TwilightsDetectorService,
    TwilightsService,
  ],
})
export class TwilightsModule {}
