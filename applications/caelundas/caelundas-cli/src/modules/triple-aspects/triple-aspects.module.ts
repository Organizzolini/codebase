import { Module } from "@nestjs/common";

import { AspectsUtilitiesModule } from "../aspects/aspects-utilities.module";

import { TripleAspectsComposerService } from "./triple-aspects-composer.service";
import { TripleAspectsDetectorService } from "./triple-aspects-detector.service";
import { TripleAspectsService } from "./triple-aspects.service";

/**
 * NestJS module for 3-body compound aspect pattern detection.
 * Exports {@link TripleAspectsService} which identifies T-Square and Grand Trine
 * configurations from the active 2-body aspect registry.
 */
@Module({
  controllers: [],
  exports: [TripleAspectsService],
  imports: [AspectsUtilitiesModule],
  providers: [
    TripleAspectsComposerService,
    TripleAspectsDetectorService,
    TripleAspectsService,
  ],
})
export class TripleAspectsModule {}
