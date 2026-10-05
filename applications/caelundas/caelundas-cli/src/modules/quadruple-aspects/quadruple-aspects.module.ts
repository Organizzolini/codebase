import { Module } from "@nestjs/common";

import { AspectsUtilitiesModule } from "../aspects/aspects-utilities.module";

import { QuadrupleAspectsBaseService } from "./quadruple-aspects-base.service";
import { QuadrupleAspectsComposerService } from "./quadruple-aspects-composer.service";
import { QuadrupleAspectsService } from "./quadruple-aspects.service";

/**
 * NestJS module for 4-body compound aspect pattern detection.
 * Exports {@link QuadrupleAspectsService} which identifies Grand Cross and Kite
 * configurations from the active 2-body aspect registry.
 */
@Module({
  controllers: [],
  exports: [QuadrupleAspectsService],
  imports: [AspectsUtilitiesModule],
  providers: [
    QuadrupleAspectsBaseService,
    QuadrupleAspectsComposerService,
    QuadrupleAspectsService,
  ],
})
export class QuadrupleAspectsModule {}
