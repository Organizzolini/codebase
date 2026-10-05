import { Module } from "@nestjs/common";

import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathModule } from "../math/math.module";

import { AspectCalculationSupportService } from "./aspect-calculation-support.service";
import { AspectEphemerisService } from "./aspect-ephemeris.service";
import { AspectEventFormattingService } from "./aspect-event-formatting.service";
import { AspectGraphService } from "./aspect-graph.service";
import { AspectPhaseEmojiService } from "./aspect-phase-emoji.service";
import { AspectsUtilitiesService } from "./aspects-utilities.service";
import { CompoundPhaseService } from "./compound-phase.service";
import { ProgressiveCompoundEventService } from "./progressive-compound-event.service";

/**
 * NestJS module providing core aspect detection utilities.
 * Exports {@link AspectsUtilitiesService} for orb checking and aspect-phase classification.
 */
@Module({
  controllers: [],
  exports: [
    AspectEphemerisService,
    AspectCalculationSupportService,
    AspectEventFormattingService,
    AspectPhaseEmojiService,
    AspectGraphService,
    AspectsUtilitiesService,
    CompoundPhaseService,
    ProgressiveCompoundEventService,
  ],
  imports: [EphemerisModule, MathModule],
  providers: [
    AspectEphemerisService,
    AspectCalculationSupportService,
    AspectEventFormattingService,
    AspectPhaseEmojiService,
    AspectGraphService,
    AspectsUtilitiesService,
    CompoundPhaseService,
    ProgressiveCompoundEventService,
  ],
})
export class AspectsUtilitiesModule {}
