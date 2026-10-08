import { Module } from "@nestjs/common";

import { InventoryService } from "./inventory.js";
import { OrdersService } from "./orders.js";

/**
 * Wires the injected dependency the way a real NestJS module would.
 *
 * The module is here so the dependency is real rather than cosmetic. Resolution
 * itself needs none of it: callidescope reads the constructor parameter's type
 * from the checker, not the provider list.
 */
@Module({
  exports: [OrdersService],
  providers: [InventoryService, OrdersService],
})
export class InjectedDependencyModule {}
