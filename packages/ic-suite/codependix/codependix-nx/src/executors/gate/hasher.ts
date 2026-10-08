// 🛠️ Utilities

import { resolveGateService } from "../../modules/plugin/plugin-context.utilities";

import type { GateHasherContext } from "../../modules/gate/gate.types";
import type { Hash, Task } from "@nx/devkit";

/**
 * Hashes one gate task for Nx's cache.
 *
 * Nx consults an executor's hasher instead of hashing the target's inputs
 * itself, which is the one place a run's own options can change whether it
 * is cacheable at all: `cache` is fixed per target, before any option is
 * read. A gate judging its own project is hashed exactly as Nx would; one
 * whose `projects` or `tags` select any other project is never replayed.
 */
export default async function gateHasher(
  task: Task,
  context: GateHasherContext,
): Promise<Hash> {
  const gateService = await resolveGateService();

  return await gateService.hashTask({ context, task });
}
