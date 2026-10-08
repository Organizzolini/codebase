import { Module } from "@nestjs/common";

import { AspectsUtilitiesModule } from "../aspects/aspects-utilities.module";
import { MathModule } from "../math/math.module";

import { QuintupleAspectsComposerService } from "./quintuple-aspects-composer.service";
import { QuintupleAspectsService } from "./quintuple-aspects.service";

/**
 * NestJS module for 5-body compound aspect pattern detection.
 * Exports {@link QuintupleAspectsService} which identifies Pentagram configurations
 * from quintile (72°) aspects among five celestial bodies.
 */
@Module({
  controllers: [],
  exports: [QuintupleAspectsService],
  imports: [MathModule, AspectsUtilitiesModule],
  providers: [QuintupleAspectsComposerService, QuintupleAspectsService],
})
export class QuintupleAspectsModule {}
