import { Injectable } from "@nestjs/common";

import { angleByAspect, orbByAspect } from "../caelundas/caelundas.constants";
import { MathService } from "../math/math.service";

import type { Aspect, AspectPhase, Body } from "../caelundas/caelundas.types";
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
  private computeAngles(args: {
    currentLongitudeBody1: number;
    currentLongitudeBody2: number;
    nextLongitudeBody1: number;
    nextLongitudeBody2: number;
    previousLongitudeBody1: number;
    previousLongitudeBody2: number;
  }): { currentAngle: number; nextAngle: number; previousAngle: number } {
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
    aspect: Aspect;
    currentAngle: number;
    nextAngle: number;
    previousAngle: number;
  }): AspectPhase | null {
    const { aspect, currentAngle, nextAngle, previousAngle } = args;
    const aspectAngle = angleByAspect[aspect];
    const orb = orbByAspect[aspect];
    const previousInOrb = Math.abs(previousAngle - aspectAngle) <= orb;
    const currentInOrb = Math.abs(currentAngle - aspectAngle) <= orb;
    const nextInOrb = Math.abs(nextAngle - aspectAngle) <= orb;
    const perfectivePhase = this.getPerfectivePhaseWhenCurrentInOrb({
      aspect,
      aspectAngle,
      currentAngle,
      currentInOrb,
      nextAngle,
      previousAngle,
    });
    if (perfectivePhase) {
      return perfectivePhase;
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
   * Returns perfective when the current angle is in orb and trend indicates exactness.
   */
  private getPerfectivePhaseWhenCurrentInOrb(args: {
    aspect: Aspect;
    aspectAngle: number;
    currentAngle: number;
    currentInOrb: boolean;
    nextAngle: number;
    previousAngle: number;
  }): "perfective" | null {
    const {
      aspect,
      aspectAngle,
      currentAngle,
      currentInOrb,
      nextAngle,
      previousAngle,
    } = args;

    if (!currentInOrb) {
      return null;
    }

    const previousDifference = previousAngle - aspectAngle;
    const currentDifference = currentAngle - aspectAngle;
    const nextDifference = nextAngle - aspectAngle;

    return this.isPerfective({
      aspect,
      currentDifference,
      nextDifference,
      previousDifference,
    })
      ? "perfective"
      : null;
  }

  /** Checks whether the aspect is exact at the current minute based on angular trend. */
  private isPerfective(args: {
    aspect: Aspect;
    currentDifference: number;
    nextDifference: number;
    previousDifference: number;
  }): boolean {
    const { aspect, currentDifference, nextDifference, previousDifference } =
      args;
    if (aspect === "conjunct") {
      return this.isPerfectiveConjunct(
        previousDifference,
        currentDifference,
        nextDifference,
      );
    }

    return this.isPerfectiveNonConjunct(previousDifference, currentDifference);
  }

  /** Uses local-angle minima to detect exact conjunctions where wrap-around can occur. */
  private isPerfectiveConjunct(
    previousDifference: number,
    currentDifference: number,
    nextDifference: number,
  ): boolean {
    return (
      (previousDifference > currentDifference &&
        nextDifference > currentDifference) ||
      (previousDifference < currentDifference &&
        nextDifference < currentDifference)
    );
  }

  // 🌎 Public Methods

  /** Detects non-conjunction perfection by checking zero-crossing of aspect-angle difference. */
  private isPerfectiveNonConjunct(
    previousDifference: number,
    currentDifference: number,
  ): boolean {
    return (
      (previousDifference >= 0 && currentDifference <= 0) ||
      (previousDifference <= 0 && currentDifference >= 0)
    );
  }

  /**
   * Returns a phase-detection function bound to a specific set of aspects.
   *
   * The returned function checks three consecutive minute positions (previous,
   * current, next) to classify a moment as "forming", "perfective", or
   * "dissolving". Conjunction uses a local-minimum bounce test; all other
   * aspects use a sign-crossing test.
   *
   * @returns Phase-detection function for the given aspect set.
   */
  getIsAspect(
    aspectsToDetect: Aspect[],
  ): (args: {
    currentLongitudeBody1: number;
    currentLongitudeBody2: number;
    nextLongitudeBody1: number;
    nextLongitudeBody2: number;
    previousLongitudeBody1: number;
    previousLongitudeBody2: number;
  }) => AspectPhase | null {
    return (args) => {
      const { currentAngle, nextAngle, previousAngle } =
        this.computeAngles(args);
      for (const aspect of aspectsToDetect) {
        const phase = this.getAspectPhase({
          aspect,
          currentAngle,
          nextAngle,
          previousAngle,
        });
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
