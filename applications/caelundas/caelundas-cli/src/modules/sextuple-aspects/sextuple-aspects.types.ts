// 🏷️ Types
import type { AspectBodies } from "../aspects/aspects.types";
import type {
  AspectPhase,
  Body,
  SextupleAspect,
} from "../caelundas/caelundas.types";
import type { Moment } from "moment-timezone";

/**
 * Precomputed display and typing fields used to assemble a sextuple-aspect event.
 */
export interface BuildSextupleEventParameters {
  aspectSymbol: string;
  bodies: Body[];
  bodiesSorted: string[];
  phase: AspectPhase;
  sextupleAspect: SextupleAspect;
  symbols: string[];
  timestamp: Moment;
}

/**
 * Adjacent snapshots plus minute context used for hexagram phase detection.
 */
export interface ComposeHexagramsArguments {
  currentAspectBodies: AspectBodies[];
  minute: Moment;
  previousAspectBodies: AspectBodies[];
}

/**
 * Bodies, phase, and timestamp needed for one sextuple-aspect boundary event.
 */
export interface GetSextupleAspectEventArguments {
  body1: Body;
  body2: Body;
  body3: Body;
  body4: Body;
  body5: Body;
  body6: Body;
  phase: AspectPhase;
  sextupleAspect: SextupleAspect;
  timestamp: Moment;
}
