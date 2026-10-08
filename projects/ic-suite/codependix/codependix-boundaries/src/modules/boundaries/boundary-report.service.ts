import { Injectable } from "@nestjs/common";

import type { BoundaryViolation } from "./boundaries.types";

/**
 * Renders violations into the lines a run prints.
 *
 * Rendering lives here rather than in the host for the same reason each graph
 * package renders its own mermaid: the package that knows what a finding means
 * is the one that should decide how it reads. There is no configured
 * destination and no file — a violation report is a list of things currently
 * wrong, which is not a document worth regenerating on the default branch or
 * checking for staleness.
 */
@Injectable()
export class BoundaryReportService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * One line summarizing what a run found.
   *
   * Counts rules as well as violations, because the two answer different
   * questions: one broken rule reporting forty edges is a single decision to
   * revisit, and forty rules reporting one edge each is not.
   */
  public renderSummary(violations: readonly BoundaryViolation[]): string {
    if (violations.length === 0) {
      return "No boundary violations.";
    }

    const rules = new Set(violations.map((violation) => violation.rule));
    const edges = violations.length === 1 ? "violation" : "violations";
    const named = rules.size === 1 ? "rule" : "rules";

    return `${violations.length} boundary ${edges} across ${rules.size} ${named}.`;
  }

  /**
   * One line per violation, each naming its level and scope before the rule's
   * own sentence.
   *
   * The level and scope lead because the message cannot carry them: the same
   * rule evaluated at file level fails once per project, and a bare pair of
   * file paths does not say whose files they are.
   */
  public renderViolations(violations: readonly BoundaryViolation[]): string[] {
    return violations.map(
      (violation) =>
        `${violation.level} ${violation.scope}: ${violation.message}`,
    );
  }
}
