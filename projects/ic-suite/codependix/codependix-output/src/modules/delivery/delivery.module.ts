import { Module } from "@nestjs/common";

import { AnchorsModule } from "../anchors/anchors.module";

import { DeliveryService } from "./delivery.service";

/** Provides the generic graph-export delivery mechanism every graph type uses. */
@Module({
  controllers: [],
  exports: [DeliveryService],
  imports: [AnchorsModule],
  providers: [DeliveryService],
})
export class DeliveryModule {}
