// 🛠️ Utilities

import { runAddressExecutor } from "../../modules/address/address.utilities";

import type { AddressExecutorOptions } from "../address.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Prints each named callable's direct callers and callees side by side — the two questions a rename or a refactor needs answered together.
 *
 * The addresses are resolved against the target's own project and its Nx
 * dependencies rather than the whole workspace, which is both faster than the
 * `callidescope breadth` command and the set the addresses actually belong to.
 */
export default async function breadthExecutor(
  options: AddressExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  return await runAddressExecutor({ context, kind: "breadth", options });
}
