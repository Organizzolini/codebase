import { Injectable } from "@nestjs/common";

import { InventoryService } from "./inventory.js";

/**
 * The headline case: a call through a constructor-injected dependency.
 *
 * Nothing in this file names `InventoryService.reserve`. The parameter property
 * carries the service's type, so the checker follows `this.inventoryService` to
 * the declaration — the hop a file-at-a-time reader cannot make.
 */
@Injectable()
export class OrdersService {
  // 🏗 Dependency Injection

  constructor(private readonly inventoryService: InventoryService) {}

  // 🌎 Public Methods

  /** Places one order against the injected inventory. */
  public place(available: number): number {
    return this.inventoryService.reserve(available);
  }
}
