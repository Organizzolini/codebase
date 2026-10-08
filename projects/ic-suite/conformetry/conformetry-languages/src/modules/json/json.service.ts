import { Injectable } from "@nestjs/common";
import { parse } from "jsonc-parser";

import { JsonComparisonService } from "./json-comparison.service";
import { JSON_VALIDATOR_DESCRIPTOR } from "./json.constants";

import type { JsonValue } from "./json.types";
import type {
  ConformetryLanguageValidator,
  DocumentValidationResult,
  PreparedValidationDocument,
} from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Checks that a JSON or JSONC file contains everything its template declares.
 *
 * Parsing goes through `jsonc-parser` so a `tsconfig.json` with comments is
 * read the same way TypeScript reads it.
 */
@Injectable()
/* v8 ignore stop */
export class JsonService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor(private readonly jsonComparisonService: JsonComparisonService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = JSON_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Reports every key or value the template requires and the instance lacks. */
  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    return this.jsonComparisonService.compare({
      instanceValue: parse(document.instance) as JsonValue,
      language: "json",
      templateValue: parse(document.renderedTemplate) as JsonValue,
    });
  }
}
