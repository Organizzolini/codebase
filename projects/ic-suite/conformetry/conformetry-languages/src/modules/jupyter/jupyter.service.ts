import { Injectable } from "@nestjs/common";
import { parse } from "jsonc-parser";

import { JsonComparisonService } from "../json/json-comparison.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonBridgeService } from "../python/python-bridge.service";

import { JupyterNotebookService } from "./jupyter-notebook.service";
import {
  JUPYTER_VALIDATOR_DESCRIPTOR,
  NOTEBOOK_ENVELOPE_KEYS,
} from "./jupyter.constants";

import type { JsonValue } from "../json/json.types";
import type { PairedCells } from "./jupyter.types";
import type {
  ConformetryDifference,
  ConformetryLanguageValidator,
  DocumentValidationResult,
  PreparedValidationDocument,
} from "@conformetry/core";

/**
 * Checks that a Jupyter notebook conforms to its template.
 *
 * A notebook is three formats at once, so this validator composes the three
 * that already exist rather than reimplementing any: JSON for the envelope,
 * markdown for prose cells, and the Python bridge for code cells. Validating a
 * code cell through Python's own parser is what lets a notebook be re-run and
 * reformatted without failing.
 */
@Injectable()
export class JupyterService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor(
    private readonly jsonComparisonService: JsonComparisonService,
    private readonly jupyterNotebookService: JupyterNotebookService,
    private readonly markdownService: MarkdownService,
    private readonly pythonBridgeService: PythonBridgeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  public readonly descriptor = JUPYTER_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  /** Prefixes an error's message so a reader knows which cell it came from. */
  private attributeToCell(args: {
    cell: PairedCells;
    differences: ConformetryDifference[];
  }): ConformetryDifference[] {
    return args.differences.map((error) => {
      return {
        ...error,
        message: `Cell ${String(args.cell.index + 1)} (${args.cell.kind}): ${error.message}`,
      };
    });
  }

  /** Reduces a notebook to the envelope keys that are compared structurally. */
  private readEnvelope(content: string): JsonValue {
    const parsed = parse(content) as JsonValue;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const envelope: Record<string, JsonValue> = {};

    for (const key of NOTEBOOK_ENVELOPE_KEYS) {
      const value = parsed[key];

      if (value !== undefined) {
        envelope[key] = value;
      }
    }

    return envelope;
  }

  /** Validates one paired cell with the validator matching its kind. */
  private validateCell(args: {
    cell: PairedCells;
    document: PreparedValidationDocument;
  }): DocumentValidationResult {
    const { cell } = args;

    if (cell.kind === "markdown") {
      const result = this.markdownService.validateDocument({
        ...args.document,
        instance: cell.instanceSource,
        renderedTemplate: cell.templateSource,
      });

      return {
        differences: this.attributeToCell({
          cell,
          differences: result.differences,
        }),
        totalWeight: result.totalWeight,
      };
    }

    if (cell.kind === "code") {
      const result = this.pythonBridgeService.validatePythonSource({
        filename: `${args.document.filename}#cell-${String(cell.index + 1)}.py`,
        instance: cell.instanceSource,
        template: cell.templateSource,
      });

      return {
        differences: this.attributeToCell({
          cell,
          differences: result.differences,
        }),
        totalWeight: result.totalWeight,
      };
    }

    return { differences: [], totalWeight: 0 };
  }

  /**
   * Weighs a cell the notebook does not have.
   *
   * Measured by comparing the template cell against an empty instance, which
   * is exactly what "none of this is present" means. Guessing a flat 1 instead
   * would let a notebook drop a forty-line code cell for the same price as an
   * empty one, and mixing in a line count would put a unit in the denominator
   * that nothing else uses.
   */
  private weighMissingCell(args: {
    cell: PairedCells;
    document: PreparedValidationDocument;
  }): number {
    return this.validateCell({
      cell: { ...args.cell, instanceSource: "" },
      document: args.document,
    }).totalWeight;
  }

  // 🌎 Public Methods

  /** Reports every notebook difference: envelope, missing cells, cell contents. */
  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    const templateNotebook = this.jupyterNotebookService.parseNotebook(
      document.renderedTemplate,
    );
    const instanceNotebook = this.jupyterNotebookService.parseNotebook(
      document.instance,
    );
    const { missingCells, pairedCells } = this.jupyterNotebookService.pairCells(
      {
        instanceNotebook,
        templateNotebook,
      },
    );
    const envelope = this.jsonComparisonService.compare({
      instanceValue: this.readEnvelope(document.instance),
      language: "json",
      templateValue: this.readEnvelope(document.renderedTemplate),
    });
    const missing = missingCells.map((cell) => {
      const weight = this.weighMissingCell({ cell, document });

      return {
        error: {
          differenceType: "code" as const,
          expected: cell.templateSource,
          fix: `Add a ${cell.kind} cell matching the template's cell ${String(cell.index + 1)}.`,
          language: "python" as const,
          message: `Missing ${cell.kind} cell ${String(cell.index + 1)}`,
          weight,
        },
        weight,
      };
    });
    const paired = pairedCells.map((cell) => {
      return this.validateCell({ cell, document });
    });

    return {
      differences: [
        ...envelope.differences,
        ...missing.map((entry) => entry.error),
        ...paired.flatMap((result) => result.differences),
      ],
      totalWeight: [
        envelope.totalWeight,
        ...missing.map((entry) => entry.weight),
        ...paired.map((result) => result.totalWeight),
      ].reduce((total, weight) => total + weight, 0),
    };
  }
}
