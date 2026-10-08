import { Injectable } from "@nestjs/common";

import { angleByAspect, orbByAspect } from "../caelundas/caelundas.constants";
import { MathService } from "../math/math.service";

import type { Aspect, AspectPhase, Body } from "../caelundas/caelundas.types";
import type { LongitudesWindow } from "./aspects.types";
import type { Moment } from "moment-timezone";

/**
 * NestJS provider exposing core aspect detection utilities.
 *
 * Two entry points are provided:
 * - {@link AspectsUtilitiesService#isAspect}: point-in-time orb check
 * - {@link AspectsUtilitiesService#getIsAspect}: factory that returns a phase-classification
 *   function (forming / perfective / dissolving) for a given set of aspects.
 */
@Injectable()
export class AspectsUtilitiesService {
  // 🏗 Dependency Injection

  constructor(private readonly mathService: MathService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Adapts two longitude windows to the shape expected by aspect-phase detectors.
   */
  static detectPhaseFromWindows(args: {
    body1LongitudesWindow: { current: number; next: number; previous: number };
    body2LongitudesWindow: { current: number; next: number; previous: number };
    detectAspectPhase: (args: {
      currentLongitudeBody1: number;
      currentLongitudeBody2: number;
      nextLongitudeBody1: number;
      nextLongitudeBody2: number;
      previousLongitudeBody1: number;
      previousLongitudeBody2: number;
    }) => AspectPhase | null;
  }): AspectPhase | null {
    const { body1LongitudesWindow, body2LongitudesWindow, detectAspectPhase } =
      args;
    return detectAspectPhase({
      currentLongitudeBody1: body1LongitudesWindow.current,
      currentLongitudeBody2: body2LongitudesWindow.current,
      nextLongitudeBody1: body1LongitudesWindow.next,
      nextLongitudeBody2: body2LongitudesWindow.next,
      previousLongitudeBody1: body1LongitudesWindow.previous,
      previousLongitudeBody2: body2LongitudesWindow.previous,
    });
  }

  /**
   * Iterates each unique unordered body pair exactly once and collects callback results.
   */
  static scanUniqueBodyPairs<Result>(args: {
    bodies: readonly Body[];
    getValue: (args: { body1: Body; body2: Body }) => null | Result;
  }): Result[] {
    const { bodies, getValue } = args;
    const values: Result[] = [];

    for (const body1 of bodies) {
      const index = bodies.indexOf(body1);
      for (const body2 of bodies.slice(index + 1)) {
        if (body1 === body2) {
          continue;
        }

        const value = getValue({ body1, body2 });
        if (value !== null) {
          values.push(value);
        }
      }
    }

    return values;
  }

  /**
   * Iterates each unique body pair for a minute and provides previous/next minute windows.
   */
  static scanUniqueBodyPairsAtMinute<EphemerisByBody, Result>(args: {
    bodies: readonly Body[];
    coordinateEphemerisByBody: EphemerisByBody;
    detect: (args: {
      body1: Body;
      body2: Body;
      coordinateEphemerisByBody: EphemerisByBody;
      minute: Moment;
      nextMinute: Moment;
      previousMinute: Moment;
    }) => null | Result;
    minute: Moment;
  }): Result[] {
    const { bodies, coordinateEphemerisByBody, detect, minute } = args;
    const previousMinute = minute.clone().subtract(1, "minute");
    const nextMinute = minute.clone().add(1, "minute");

    return AspectsUtilitiesService.scanUniqueBodyPairs({
      bodies,
      getValue: ({ body1, body2 }) =>
        detect({
          body1,
          body2,
          coordinateEphemerisByBody,
          minute,
          nextMinute,
          previousMinute,
        }),
    });
  }

  /** Computes previous, current, and next separation angles for a two-body longitude window. */
  private computeAngles(args: LongitudesWindow): {
    currentAngle: number;
    nextAngle: number;
    previousAngle: number;
  } {
    const {
      currentLongitudeBody1,
      currentLongitudeBody2,
      nextLongitudeBody1,
      nextLongitudeBody2,
      previousLongitudeBody1,
      previousLongitudeBody2,
    } = args;
    const previousAngle = this.mathService.getAngle(
      previousLongitudeBody1,
      previousLongitudeBody2,
    );
    const currentAngle = this.mathService.getAngle(
      currentLongitudeBody1,
      currentLongitudeBody2,
    );
    const nextAngle = this.mathService.getAngle(
      nextLongitudeBody1,
      nextLongitudeBody2,
    );
    return { currentAngle, nextAngle, previousAngle };
  }

  /** Resolves whether the aspect is entering, exacting, or leaving orb at the current minute. */
  private getAspectPhase(args: {
    angles: { currentAngle: number; nextAngle: number; previousAngle: number };
    aspect: Aspect;
    longitudes: LongitudesWindow;
  }): AspectPhase | null {
    const { angles, aspect, longitudes } = args;
    const aspectAngle = angleByAspect[aspect];
    const orb = orbByAspect[aspect];
    const previousInOrb = Math.abs(angles.previousAngle - aspectAngle) <= orb;
    const currentInOrb = Math.abs(angles.currentAngle - aspectAngle) <= orb;
    const nextInOrb = Math.abs(angles.nextAngle - aspectAngle) <= orb;
    if (currentInOrb && this.isPerfective({ angles, aspect, longitudes })) {
      return "perfective";
    }
    if (!previousInOrb && currentInOrb) {
      return "forming";
    }
    if (currentInOrb && !nextInOrb) {
      return "dissolving";
    }
    return null;
  }

  /**
   * Signed offset of body 1 from body 2 relative to an aspect angle, wrapped to [−180°, 180°).
   */
  private getSignedOffset(args: {
    aspectAngle: number;
    longitudeBody1: number;
    longitudeBody2: number;
  }): number {
    const { aspectAngle, longitudeBody1, longitudeBody2 } = args;
    return (
      this.mathService.normalizeDegrees(
        longitudeBody1 - longitudeBody2 - aspectAngle + 180,
      ) - 180
    );
  }

  /** Checks whether the aspect becomes exact between the previous and current minute. */
  private isPerfective(args: {
    angles: { currentAngle: number; previousAngle: number };
    aspect: Aspect;
    longitudes: LongitudesWindow;
  }): boolean {
    const { angles, aspect, longitudes } = args;
    const aspectAngle = angleByAspect[aspect];
    if (aspect === "conjunct" || aspect === "opposite") {
      return this.isSignedOffsetSignChange({ aspectAngle, longitudes });
    }

    return this.isPerfectiveByUnsignedAngle(
      angles.previousAngle - aspectAngle,
      angles.currentAngle - aspectAngle,
    );
  }

  /** Detects perfection by zero-crossing of the unsigned separation minus the aspect angle. */
  private isPerfectiveByUnsignedAngle(
    previousDifference: number,
    currentDifference: number,
  ): boolean {
    return (
      (previousDifference >= 0 && currentDifference <= 0) ||
      (previousDifference <= 0 && currentDifference >= 0)
    );
  }

  /**
   * Detects perfection when the signed offset from the aspect angle changes sign,
   * rejecting the jump across the ±180° wrap, which is the opposite alignment.
   */
  private isSignedOffsetSignChange(args: {
    aspectAngle: number;
    longitudes: LongitudesWindow;
  }): boolean {
    const { aspectAngle, longitudes } = args;
    const previousOffset = this.getSignedOffset({
      aspectAngle,
      longitudeBody1: longitudes.previousLongitudeBody1,
      longitudeBody2: longitudes.previousLongitudeBody2,
    });
    const currentOffset = this.getSignedOffset({
      aspectAngle,
      longitudeBody1: longitudes.currentLongitudeBody1,
      longitudeBody2: longitudes.currentLongitudeBody2,
    });
    if (Math.abs(currentOffset - previousOffset) >= 180) {
      return false;
    }
    return (
      (previousOffset < 0 && currentOffset >= 0) ||
      (previousOffset > 0 && currentOffset <= 0)
    );
  }

  // 🌎 Public Methods

  /**
   * Returns a phase-detection function bound to a specific set of aspects.
   *
   * The returned function checks three consecutive minute positions (previous,
   * current, next) to classify a moment as "forming", "perfective", or
   * "dissolving". Conjunction and opposition are perfective when the signed
   * separation crosses 0° or 180°; other aspects use the unsigned separation.
   *
   * @returns Phase-detection function for the given aspect set.
   */
  getIsAspect(
    aspectsToDetect: Aspect[],
  ): (args: LongitudesWindow) => AspectPhase | null {
    return (longitudes) => {
      const angles = this.computeAngles(longitudes);
      for (const aspect of aspectsToDetect) {
        const phase = this.getAspectPhase({ angles, aspect, longitudes });
        if (phase !== null) {
          return phase;
        }
      }
      return null;
    };
  }

  /**
   * Returns `true` when the angular separation between two bodies falls within
   * the configured orb for the given aspect.
   */
  isAspect(args: {
    aspect: Aspect;
    longitudeBody1: number;
    longitudeBody2: number;
  }): boolean {
    const { aspect, longitudeBody1, longitudeBody2 } = args;
    const angle = this.mathService.getAngle(longitudeBody1, longitudeBody2);
    const difference = Math.abs(angle - angleByAspect[aspect]);
    return difference <= orbByAspect[aspect];
  }
}
