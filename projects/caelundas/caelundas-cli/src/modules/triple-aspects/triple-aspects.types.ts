// 🏷️ Types
import type { Body, TripleAspect } from "../caelundas/caelundas.types";

/**
 * Typed body/aspect metadata extracted from a forming triple-aspect event for progressive output.
 */
export interface ProgressiveBodiesMeta {
  aspect: TripleAspect;
  body1: Body;
  body1Capitalized: string;
  body2: Body;
  body2Capitalized: string;
  body3: Body;
  body3Capitalized: string;
}
