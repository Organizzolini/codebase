// 🏷️ Types
import type { AspectBodies } from "../aspects/aspects.types";

/**
 * Carries the aspect-body state produced for a single minute so it can be
 * threaded into the next iteration of the perfective detection loop.
 */
export type PreviousAspectBodies = AspectBodies[];
