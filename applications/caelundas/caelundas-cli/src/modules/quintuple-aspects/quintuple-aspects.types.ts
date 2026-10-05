// 🏷️ Types
import type { AspectBodies } from "../aspects/aspects.types";
import type {
  AspectPhase,
  Body,
  QuintupleAspect,
} from "../caelundas/caelundas.types";
import type { Moment } from "moment-timezone";

/**
 * Precomputed display and typing fields used to assemble a quintuple-aspect event.
 */
export interface BuildQuintupleEventParameters {
  aspectSymbol: string;
  bodies: Body[];
  bodiesSorted: string[];
  phase: AspectPhase;
  quintupleAspect: QuintupleAspect;
  symbols: string[];
  timestamp: Moment;
}

/**
 * Adjacent snapshots plus minute context used for pentagram phase detection.
 */
export interface ComposePentagramsArguments {
  currentAspectBodies: AspectBodies[];
  minute: Moment;
  previousAspectBodies: AspectBodies[];
}

/**
 * Bodies, phase, and timestamp needed for one quintuple-aspect boundary event.
 */
export interface GetQuintupleAspectEventArguments {
  body1: Body;
  body2: Body;
  body3: Body;
  body4: Body;
  body5: Body;
  phase: AspectPhase;
  quintupleAspect: QuintupleAspect;
  timestamp: Moment;
}
