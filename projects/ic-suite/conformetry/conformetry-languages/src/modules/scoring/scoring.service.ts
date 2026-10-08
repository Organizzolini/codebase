import { Injectable } from "@nestjs/common";

import {
  DEFAULT_ERROR_WEIGHT,
  EMPTY_TEMPLATE_SCORE,
  PERFECT_SCORE,
} from "./scoring.constants";

import type { CalculateScoreArguments, WeightedFinding } from "./scoring.types";

/**
 * Turns weights into conformance scores.
 *
 * The arithmetic is small but it is the same arithmetic in seven places — one
 * per language package, plus the file-existence pass and the run aggregate —
 * and it has two edge cases worth getting right once: the default weight of a
 * finding that declares none, and an empty template whose denominator is zero.
 */
@Injectable()
export class ScoringService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Returns the share of the checked requirements the instance honoured, from
   * 0 to 1.
   *
   * Clamped at both ends. A validator that double-counts an overlapping
   * requirement could otherwise report a failed weight above the total and
   * produce a negative score, which would read as a much worse instance than
   * one that is simply entirely wrong.
   */
  public calculateScore(args: CalculateScoreArguments): number {
    if (args.totalWeight <= 0) {
      return EMPTY_TEMPLATE_SCORE;
    }

    const score = (args.totalWeight - args.failedWeight) / args.totalWeight;

    return Math.min(PERFECT_SCORE, Math.max(0, score));
  }

  /** Adds up what a set of findings costs, defaulting each to its own weight. */
  public sumWeights(differences: readonly WeightedFinding[]): number {
    return differences.reduce((total, error) => {
      return total + (error.weight ?? DEFAULT_ERROR_WEIGHT);
    }, 0);
  }
}
