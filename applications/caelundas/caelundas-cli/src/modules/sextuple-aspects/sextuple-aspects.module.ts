import { Module } from "@nestjs/common";

import { AspectsUtilitiesModule } from "../aspects/aspects-utilities.module";
import { MathModule } from "../math/math.module";
import { ProgressiveUtilitiesModule } from "../progressive/progressive-utilities.module";

import { SextupleAspectsComposerService } from "./sextuple-aspects-composer.service";
import { SextupleAspectsService } from "./sextuple-aspects.service";

/**
 * NestJS module for 6-body compound aspect pattern detection.
 * Exports {@link SextupleAspectsService} which identifies Hexagram (Star of David)
 * configurations from trine and sextile aspects among six celestial bodies.
 */
@Module({
  controllers: [],
  exports: [SextupleAspectsService],
  imports: [MathModule, AspectsUtilitiesModule, ProgressiveUtilitiesModule],
  providers: [SextupleAspectsComposerService, SextupleAspectsService],
})
export class SextupleAspectsModule {}
