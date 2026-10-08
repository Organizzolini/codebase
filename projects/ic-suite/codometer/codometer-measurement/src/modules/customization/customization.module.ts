import { Module } from "@nestjs/common";

import { CustomizationService } from "./customization.service";

/**
 * NestJS module that provides the configured file-name counters.
 */
@Module({
  controllers: [],
  exports: [CustomizationService],
  imports: [],
  providers: [CustomizationService],
})
export class CustomizationModule {}
