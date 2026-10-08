// 🏷️ Types

import type { MatchedInstance } from "@conformetry/configuration";
import type {
  ConformetryDifference,
  ValidationFileResult,
} from "@conformetry/core";

/** Arguments for checking matched instances against the templates they matched. */
export interface CheckInstanceFilesArguments {
  readonly instances: MatchedInstance[];
}

/**
 * What the existence pass found, and how much it asked for.
 *
 * The total counts every declared file, present ones included: a template
 * asking for twenty files and getting nineteen has lost a twentieth of itself,
 * which only the full denominator can say.
 */
export interface FilesCheckResult {
  readonly fileResults: ValidationFileResult[];
  /** One requirement per file the matched templates declare. */
  readonly totalWeight: number;
}

/**
 * A conformance error this pass always weighs.
 *
 * `ConformetryDifference.weight` is optional because most validators leave it to
 * default. Every finding here carries one, so narrowing the type removes a
 * fallback that could never be reached.
 */
export interface WeighedConformetryDifference extends ConformetryDifference {
  readonly weight: number;
}
