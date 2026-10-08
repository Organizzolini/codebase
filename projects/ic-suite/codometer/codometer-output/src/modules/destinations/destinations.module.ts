import { Module } from "@nestjs/common";

import { DestinationsService } from "./destinations.service";

/**
 * NestJS module that resolves where each of a run's outputs goes.
 */
@Module({
  controllers: [],
  exports: [DestinationsService],
  imports: [],
  providers: [DestinationsService],
})
export class DestinationsModule {}
