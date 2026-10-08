import { Module } from "@nestjs/common";

import { MathService } from "./math.service";

/**
 * NestJS module providing mathematical utility functions.
 * Exports {@link MathService} for angular math, interpolation, and related calculations.
 */
@Module({
  controllers: [],
  exports: [MathService],
  imports: [],
  providers: [MathService],
})
export class MathModule {}
