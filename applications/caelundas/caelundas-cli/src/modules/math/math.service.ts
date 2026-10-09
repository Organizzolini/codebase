import { Injectable } from "@nestjs/common";

import type { Coordinates, Longitude } from "../ephemeris/ephemeris.types";
import type { NeighborValues } from "./math.types";

/**
 * NestJS provider exposing mathematical utility functions for astronomical calculations.
 *
 * Provides injectable access to angle normalization, angular distance, extremum detection,
 * and combinatorics utilities used across event detection services.
 *
 * Arc measurement constants are `static readonly` so they can be referenced in
 * static class fields of consumer services without requiring DI injection.
 */
@Injectable()
export class MathService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /**
   * Number of arcminutes in one degree (60).
   */
  static readonly arcminutesPerDegree = 60;

  /**
   * Number of arcseconds in one arcminute (60).
   */
  static readonly arcsecondsPerArcminute = 60;

  /**
   * Number of arcseconds in one degree (3600).
   */
  static readonly arcsecondsPerDegree = 3600;

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Whether a value crosses zero upward nearest the current minute: a
   * crossing between the previous minute and this one belongs here when it
   * falls in its second half, and one between this minute and the next when
   * it falls in its first half. Each crossing lands on exactly one minute.
   */
  crossesUpwardNearCurrent(args: NeighborValues): boolean {
    const { current, next, previous } = args;
    if (previous < 0 && current >= 0) {
      return previous / (previous - current) >= 0.5;
    }
    if (current < 0 && next >= 0) {
      return current / (current - next) < 0.5;
    }
    return false;
  }

  /**
   * Calculates the shortest angular distance between two ecliptic longitudes.
   *
   * This function computes the minimum arc length between two positions on the
   * ecliptic circle. The result is always in the range [0, 180] degrees, as it
   * measures the shorter of the two possible arcs between the points.
   *
   *
   * @remarks
   * Algorithm:
   * 1. Normalize both longitudes to [0, 360)
   * 2. Calculate absolute difference
   * 3. If difference \> 180°, take the reflex angle (360° - angle)
   *
   * This is used extensively in aspect detection to determine the angular
   * separation between celestial bodies.
   *
   * @example
   * ```typescript
   * mathService.getAngle(10, 350);   // Returns 20 (not 340)
   * mathService.getAngle(0, 180);    // Returns 180
   * mathService.getAngle(45, 135);   // Returns 90
   * mathService.getAngle(350, 10);   // Returns 20 (symmetric)
   * ```
   */
  getAngle(longitude1: Longitude, longitude2: Longitude): number {
    const normalizedLongitude1 = this.normalizeDegrees(longitude1);
    const normalizedLongitude2 = this.normalizeDegrees(longitude2);

    let angle = Math.abs(normalizedLongitude1 - normalizedLongitude2);
    if (angle > 180) {
      angle = 360 - angle;
    }
    return angle;
  }

  /**
   * Calculates the true angular separation between two ecliptic positions.
   *
   * Unlike {@link getAngle}, which compares longitudes alone, this measures
   * the great-circle arc between the two points, so latitude counts. It takes
   * the arctangent of the cross and dot products, which stays exact for both
   * tiny and near-antipodal separations where the arccosine form loses
   * precision. The result is in [0, 180] degrees.
   *
   * @example
   * ```typescript
   * mathService.getAngularSeparation([10, 0], [350, 0]);  // Returns 20
   * mathService.getAngularSeparation([100, 30], [100, -15]); // Returns 45
   * ```
   */
  getAngularSeparation(first: Coordinates, second: Coordinates): number {
    const toRadians = Math.PI / 180;
    const [firstLongitude, firstLatitude] = first;
    const [secondLongitude, secondLatitude] = second;
    const latitude1 = firstLatitude * toRadians;
    const latitude2 = secondLatitude * toRadians;
    const longitudeGap = (secondLongitude - firstLongitude) * toRadians;
    const across = Math.hypot(
      Math.cos(latitude2) * Math.sin(longitudeGap),
      Math.cos(latitude1) * Math.sin(latitude2) -
        Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(longitudeGap),
    );
    const along =
      Math.sin(latitude1) * Math.sin(latitude2) +
      Math.cos(latitude1) * Math.cos(latitude2) * Math.cos(longitudeGap);
    return Math.atan2(across, along) / toRadians;
  }

  /**
   * Generates all combinations of k elements from an array.
   *
   * Uses recursive backtracking algorithm. Time complexity: O(n choose k).
   *
   * @example
   * ```typescript
   * mathService.getCombinations(['Sun', 'Moon', 'Mars'], 2);
   * // Returns: [['Sun','Moon'], ['Sun','Mars'], ['Moon','Mars']]
   * ```
   */
  getCombinations<T>(array: T[], combinationSize: number): T[][] {
    const result: T[][] = [];

    /** Recursively builds fixed-size combinations by extending the current selection in order. */
    function combine(start: number, chosen: T[]): void {
      if (chosen.length === combinationSize) {
        result.push([...chosen]);
        return;
      }

      for (let position = start; position < array.length; position++) {
        const element = array[position];
        if (element) {
          chosen.push(element);
          combine(position + 1, chosen);
          chosen.pop();
        }
      }
    }

    combine(0, []);
    return result;
  }

  /**
   * Determines whether a value is a local maximum in a discrete sequence.
   *
   *
   * @example
   * ```typescript
   * mathService.isMaximum({ current: 100, previous: 99, next: 98 });  // true
   * mathService.isMaximum({ current: 100, previous: 100, next: 99 }); // false
   * ```
   */
  isMaximum(args: NeighborValues): boolean {
    const { current, next, previous } = args;
    return previous < current && current > next;
  }

  /**
   * Determines whether a value is a local minimum in a discrete sequence.
   *
   *
   * @example
   * ```typescript
   * mathService.isMinimum({ current: 10, previous: 15, next: 12 });  // true
   * mathService.isMinimum({ current: 10, previous: 10, next: 12 });  // false
   * ```
   */
  isMinimum(args: NeighborValues): boolean {
    const { current, next, previous } = args;
    return previous > current && current < next;
  }

  /**
   * Normalizes an angle in degrees to the range [0, 360).
   *
   *
   * @example
   * ```typescript
   * mathService.normalizeDegrees(450);  // Returns 90
   * mathService.normalizeDegrees(-45);  // Returns 315
   * ```
   */
  normalizeDegrees(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
  }

  /**
   * Normalizes a longitude value for continuous comparison with a reference longitude.
   *
   * Adjusts longitude to eliminate discontinuities when comparing or interpolating
   * across the 0°/360° boundary. Essential for root-finding algorithms and aspect
   * detection. Unlike {@link normalizeDegrees}, can return values outside [0, 360).
   *
   *
   * @example
   * ```typescript
   * mathService.normalizeForComparison(10, 350);  // Returns 370
   * mathService.normalizeForComparison(350, 10);  // Returns -10
   * ```
   */
  normalizeForComparison(current: Longitude, reference: Longitude): number {
    if (Math.abs(current - reference) > 180) {
      return current < reference ? current + 360 : current - 360;
    }
    return current;
  }
}
