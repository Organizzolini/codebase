import { Injectable } from "@nestjs/common";

import {
  SCOPE_FIELD_LABEL,
  SCOPE_LABEL_PREFIX,
  TYPE_FIELD_LABEL,
  TYPE_LABEL_PREFIX,
} from "./issue-labels.constants";

import type { IssueFormAnswers } from "./issue-labels.types";

/**
 * Reads a submitted `issue.yml` body and says which labels it implies.
 *
 * Pure throughout: every method is a function of what it is handed, so the
 * whole rule set is testable without an issue, a token, or a network. Talking
 * to `gh` is the command's job, not this one's.
 *
 * GitHub renders a submitted Type or Scope dropdown answer as `### Type` /
 * `### Scope`, a blank line, then the answer. An issue opened directly
 * through `gh issue create` or the API carries neither marker, so there is
 * nothing here to derive a label from — this reconciliation only ever adds
 * labels an `issue.yml` submission actually named.
 */
@Injectable()
export class IssueLabelsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads one dropdown field's answer out of a rendered issue-form body.
   *
   * An unfilled optional field renders as the literal placeholder
   * `_No response_`, which is treated the same as no answer at all.
   */
  private extractFormField(body: string, label: string): string | undefined {
    const pattern = new RegExp(
      String.raw`### ${label}\r?\n\r?\n([^\r\n]+)`,
      "u",
    );
    const match = pattern.exec(body);
    const value = match?.[1]?.trim();

    return value === undefined || value === "" || value === "_No response_"
      ? undefined
      : value;
  }

  // 🌎 Public Methods

  /**
   * The labels this issue's form answers imply, whichever of the two it has.
   */
  public labelsFromAnswers(formAnswers: IssueFormAnswers): string[] {
    const labels: string[] = [];

    if (formAnswers.type !== undefined) {
      labels.push(`${TYPE_LABEL_PREFIX}${formAnswers.type}`);
    }
    if (formAnswers.scope !== undefined) {
      labels.push(`${SCOPE_LABEL_PREFIX}${formAnswers.scope}`);
    }

    return labels;
  }

  /**
   * The labels the form implies that this issue does not already carry.
   */
  public missingLabels(
    formAnswers: IssueFormAnswers,
    existingLabelNames: readonly string[],
  ): string[] {
    return this.labelsFromAnswers(formAnswers).filter(
      (label) => !existingLabelNames.includes(label),
    );
  }

  /**
   * Reads the Type and Scope answers out of a rendered `issue.yml`
   * submission, if this body carries them at all.
   */
  public parseFormAnswers(body: string): IssueFormAnswers {
    const type = this.extractFormField(body, TYPE_FIELD_LABEL);
    const scope = this.extractFormField(body, SCOPE_FIELD_LABEL);

    return {
      ...(type === undefined ? {} : { type }),
      ...(scope === undefined ? {} : { scope }),
    };
  }
}
