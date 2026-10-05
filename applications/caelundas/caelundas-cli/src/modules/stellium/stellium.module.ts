import { Module } from "@nestjs/common";

import { AspectsUtilitiesModule } from "../aspects/aspects-utilities.module";

import { StelliumService } from "./stellium.service";

/**
 * NestJS module for stellium configuration detection.
 * Exports {@link StelliumService} which identifies concentrations of 4 or more
 * celestial bodies in close conjunction via graph traversal over active aspects.
 */
@Module({
  controllers: [],
  exports: [StelliumService],
  imports: [AspectsUtilitiesModule],
  providers: [StelliumService],
})
export class StelliumModule {}
