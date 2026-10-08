// 🏷️ Types

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Aspect, Body } from "../caelundas/caelundas.types";
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
  detect(arguments_: CompositeAspectDetectorArguments): DetectedCalendarEvent[];
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
 * Ecliptic longitudes of two bodies at the previous, current, and next minute.
 */
export interface LongitudesWindow {
  currentLongitudeBody1: number;
  currentLongitudeBody2: number;
  nextLongitudeBody1: number;
  nextLongitudeBody2: number;
  previousLongitudeBody1: number;
  previousLongitudeBody2: number;
}

/**
 * Converts instantaneous aspect events into duration spans by pairing boundaries.
 */
export interface ProgressiveAspectDetector {
  detectProgressive(events: DetectedCalendarEvent[]): DetectedCalendarEvent[];
}

/**
 * Detects pairwise (2-body) aspect events directly from ephemeris snapshots.
 */
export interface SimpleAspectDetector {
  detect(arguments_: SimpleAspectDetectorArguments): DetectedCalendarEvent[];
}

/**
 * Minute-indexed longitudes for all bodies plus the minute being evaluated.
 */
export interface SimpleAspectDetectorArguments {
  coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
  minute: Moment;
}
