// 🏷️ Types
import type { Body } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Three-minute longitude context for evaluating one body pair's major-aspect phase.
 */
export interface DetectAspectForBodyPairArguments {
  body1: Body;
  body2: Body;
  coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
  minute: Moment;
  nextMinute: Moment;
  previousMinute: Moment;
}
