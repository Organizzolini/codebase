// 🏷️ Types

import type {
  ConformetryLanguageValidator,
  PreparedValidationDocument,
} from "@conformetry/core";

/** Arguments for running one language validator over a prepared document set. */
export interface RunLanguageValidatorArguments {
  readonly checkedPaths: string[];
  readonly documents: PreparedValidationDocument[];
  readonly validator: ConformetryLanguageValidator;
}
