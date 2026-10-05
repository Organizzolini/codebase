// 🏷️ Types

import type { Aspect, Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Represents an active aspect between two celestial bodies at a specific moment.
 */
export interface AspectBodies {
  aspect: Aspect;
  bodies: [Body, Body];
}

/**
 * Detects multi-body aspect patterns from already-detected simple aspect edges.
 */
export interface CompositeAspectDetector {
  detect(arguments_: CompositeAspectDetectorArguments): Event[];
}

/**
 * Two-snapshot input used to derive forming/dissolving compound-aspect events.
 */
export interface CompositeAspectDetectorArguments {
  currentAspectBodies: AspectBodies[];
  minute: Moment;
  previousAspectBodies: AspectBodies[];
}

/**
 * Converts instantaneous aspect events into duration spans by pairing boundaries.
 */
export interface ProgressiveAspectDetector {
  detectProgressive(events: Event[]): Event[];
}

/**
 * Detects pairwise (2-body) aspect events directly from ephemeris snapshots.
 */
export interface SimpleAspectDetector {
  detect(arguments_: SimpleAspectDetectorArguments): Event[];
}

/**
 * Minute-indexed longitudes for all bodies plus the minute being evaluated.
 */
export interface SimpleAspectDetectorArguments {
  coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
  minute: Moment;
}
