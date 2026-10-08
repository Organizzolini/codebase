import { InventoryService } from "../examples/injected-dependency/inventory.js";
import { OrdersService } from "../examples/injected-dependency/orders.js";

/**
 * The `module-bootstrap` entry-point kind.
 *
 * A function named `bootstrap` or `main` in `src/main.ts` is where a project
 * starts itself, so it is a root regardless of whether anything imports it.
 * This one is never executed — the package ships fixtures, not a program.
 *
 * It lives in `src/` rather than beside the other entry-point fixtures because
 * the rule keys on that literal path. See `examples/entry-points`.
 */
export const bootstrap = (): number =>
  new OrdersService(new InventoryService()).place(3);
