import { Injectable } from "@nestjs/common";

import { PythonBridgeService } from "./python-bridge.service";
import { PYTHON_VALIDATOR_DESCRIPTOR } from "./python.constants";

import type {
  ConformetryLanguageValidator,
  DocumentValidationResult,
  PreparedValidationDocument,
} from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Checks that a Python file declares everything its template requires.
 *
 * Comparison is structural, through Python's own `ast` module, so reformatting
 * a file or reordering its declarations does not fail validation while
 * deleting a required class or function does.
 */
@Injectable()
/* v8 ignore stop */
export class PythonService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor(private readonly pythonBridgeService: PythonBridgeService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = PYTHON_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Reports every declaration and comment the template requires. */
  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    return this.pythonBridgeService.validatePythonSource({
      filename: document.filename,
      instance: document.instance,
      template: document.renderedTemplate,
    });
  }
}
