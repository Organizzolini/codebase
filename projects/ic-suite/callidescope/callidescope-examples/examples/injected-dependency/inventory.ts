import { Injectable } from "@nestjs/common";

/** Holds the stock counts orders are reserved against. */
@Injectable()
export class InventoryService {
  // 🌎 Public Methods

  /** Reserves one unit and reports the count left behind. */
  public reserve(available: number): number {
    return Math.max(available - 1, 0);
  }
}
