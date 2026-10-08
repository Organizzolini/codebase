import { Injectable } from "@nestjs/common";

import { roundToCents } from "../shared-tail/round-to-cents.js";

/**
 * Eight frames, every one of which does something.
 *
 * This is the stack to compare `ForwardingStackService` against. Both are eight
 * deep and both breach the limit, but every layer here transforms the amount it
 * was handed, so the fix is to question whether pricing needs this many stages
 * — not to delete a layer that was only passing the argument along.
 */
@Injectable()
export class DeepStackService {
  // 🔏 Private Methods

  /** Adds tax at the resolved rate. */
  private applyTax(amount: number, rate: number): number {
    return this.convertCurrency(amount * (1 + rate));
  }

  /** Converts to the reporting currency and rounds through the shared tail. */
  private convertCurrency(amount: number): number {
    return roundToCents(amount * 1.08);
  }

  /** Looks up the tax rate the resolved tier pays. */
  private loadRate(amount: number, tier: number): number {
    return this.applyTax(amount, tier === 0 ? 0.2 : 0.05);
  }

  /** Removes the tier discount from the validated amount. */
  private removeDiscount(amount: number): number {
    return this.resolveTier(amount - Math.min(amount * 0.1, 25));
  }

  /** Picks the pricing tier the discounted amount falls into. */
  private resolveTier(amount: number): number {
    return this.loadRate(amount, amount > 100 ? 1 : 0);
  }

  /** Rejects a negative amount before anything else reads it. */
  private validate(amount: number): number {
    return this.removeDiscount(Math.max(amount, 0));
  }

  // 🌎 Public Methods

  /** Quotes one order, priced through every stage below. */
  public quote(amount: number): number {
    return this.validate(amount);
  }
}
