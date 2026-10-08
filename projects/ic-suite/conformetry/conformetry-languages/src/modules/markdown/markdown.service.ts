import { Injectable } from "@nestjs/common";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { MarkdownTreeService } from "./markdown-tree.service";
import { MARKDOWN_VALIDATOR_DESCRIPTOR } from "./markdown.constants";

import type {
  ConformetryDifference,
  ConformetryLanguageValidator,
  DocumentValidationResult,
  PreparedValidationDocument,
} from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Checks that a markdown file contains every structure its template declares.
 *
 * Comparison is structural rather than textual: headings, code fences, links,
 * and tables are matched as mdast nodes, so reformatting or reflowing prose
 * does not fail validation while deleting a required section does.
 */
@Injectable()
/* v8 ignore stop */
export class MarkdownService implements ConformetryLanguageValidator {
  // 🏗 Dependency Injection

  constructor(
    private readonly markdownNodesService: MarkdownNodesService,
    private readonly markdownTreeService: MarkdownTreeService,
  ) {}

  // 🔐 Private Fields

  /** GitHub-flavored so tables and task lists parse as their own node types. */
  private readonly processor = remark().use(remarkGfm);

  // 🔑 Public Fields

  public readonly descriptor = MARKDOWN_VALIDATOR_DESCRIPTOR;

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Reports every markdown structure the template requires and the file lacks. */
  public validateDocument(
    document: PreparedValidationDocument,
  ): DocumentValidationResult {
    const templateTree = this.processor.parse(document.renderedTemplate);
    const instanceTree = this.processor.parse(document.instance);
    const comparison = this.markdownTreeService.compareChildren({
      instanceChildren: this.markdownNodesService.filterNodes(
        instanceTree.children,
      ),
      templateChildren: this.markdownNodesService.filterNodes(
        templateTree.children,
      ),
    });
    const differences: ConformetryDifference[] = comparison.differences.map(
      (error) => {
        return {
          differenceType: "code",
          expected: error.text,
          fix: `Add the ${error.nodeType} "${error.text}" to the instance file.`,
          ...(error.instanceLine === undefined
            ? {}
            : { instanceLine: error.instanceLine }),
          language: "markdown",
          message: `Missing markdown ${error.nodeType}: "${error.text}"`,
          weight: error.weight,
        };
      },
    );

    return {
      ...(comparison.captures === undefined
        ? {}
        : { captures: comparison.captures }),
      differences,
      totalWeight: comparison.totalWeight,
    };
  }
}
