// 🏷️ Types

/** Arguments for turning a weight pair into a score. */
export interface CalculateScoreArguments {
  /** Combined weight of the requirements the instance failed. */
  readonly failedWeight: number;
  /** Combined weight of the requirements that were checked. */
  readonly totalWeight: number;
}

/**
 * Anything that carries a weight.
 *
 * Deliberately narrower than `ConformetryDifference`: a language package weighs its
 * own internal findings before they are ever described as conformetry differences,
 * and requiring the full error shape would force it to build messages just to
 * count.
 */
export interface WeightedFinding {
  readonly weight?: number;
}
