import { Module } from "@nestjs/common";

import { InventoryService } from "./inventory.service";

/**
 * Provides the template and instance inventory renderer.
 */
@Module({
  controllers: [],
  exports: [InventoryService],
  imports: [],
  providers: [InventoryService],
})
export class InventoryModule {}
