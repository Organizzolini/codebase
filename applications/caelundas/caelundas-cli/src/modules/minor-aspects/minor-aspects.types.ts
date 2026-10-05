// 🏷️ Types
import type {
  AspectPhase,
  Body,
  MinorAspect,
} from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Inputs used to build one minor-aspect boundary event for a body pair.
 */
export interface AssembleMinorAspectEventArguments {
  body1: Body;
  body2: Body;
  minorAspect: MinorAspect;
  phase: AspectPhase;
  timestamp: Moment;
}

/**
 * Three-minute longitude snapshots used to classify one body pair's minor-aspect phase.
 */
export interface DetectBodyPairAspectArguments {
  body1: Body;
  body2: Body;
  coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
  minute: Moment;
  nextMinute: Moment;
  previousMinute: Moment;
}

/**
 * Typed aspect and body names parsed from an event's category labels.
 */
export interface ExtractAspectComponentsResult {
  aspect: MinorAspect;
  aspectCapitalized: string;
  body1: Body;
  body1Capitalized: string;
  body2: Body;
  body2Capitalized: string;
}
