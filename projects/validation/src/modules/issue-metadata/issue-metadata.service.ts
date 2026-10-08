import { Injectable } from "@nestjs/common";

import {
  CONVENTIONAL_ISSUE_TITLE_PATTERN,
  MAX_HIERARCHY_DEPTH,
  PARENT_ISSUE_PATTERN,
  RELEASE_LEVEL_RANK,
  SCOPE_FIELD_LABEL,
  SCOPE_LABEL_PREFIX,
  SOURCE_LABEL_PREFIX,
  SOURCE_LABELS,
  TYPE_FIELD_LABEL,
  TYPE_LABEL_PREFIX,
  TYPE_RELEASE_LEVEL,
} from "./issue-metadata.constants";

import type {
  BulkIssuesVerdict,
  GroupedLabels,
  HierarchyViolation,
  IssueFormAnswers,
  IssueMetadata,
  IssueMetadataResolution,
  IssueSummary,
  MetadataVerdict,
} from "./issue-metadata.types";

/**
 * Reads an issue's metadata and says whether its labels agree with it.
 */
@Injectable()
export class IssueMetadataService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Checks if a sub-issue exceeds its parent's release level. */
  private checkReleaseSignificanceViolation(
    child: IssueSummary,
    parent: IssueSummary,
    violations: HierarchyViolation[],
  ): void {
    const childRelease = this.resolveIssueReleaseLevel({
      body: child.body,
      labelNames: child.labels.map((label) => label.name),
      title: child.title,
    });
    const parentRelease = this.resolveIssueReleaseLevel({
      body: parent.body,
      labelNames: parent.labels.map((label) => label.name),
      title: parent.title,
    });

    if (childRelease.rank > parentRelease.rank) {
      violations.push({
        childNumber: child.number,
        message: `Sub-issue #${child.number} (${childRelease.type}, release: ${childRelease.level}) exceeds parent #${parent.number} (${parentRelease.type}, release: ${parentRelease.level}) release significance`,
        parentNumber: parent.number,
      });
    }
  }

  /** At least one scope label. */
  private checkScopeLabels(
    options: {
      readonly formAnswers: IssueFormAnswers;
      readonly issueNumber: string;
    },
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const { formAnswers, issueNumber } = options;

    if (formAnswers.scope === undefined) {
      if (labels.scopeLabels.length === 0) {
        record("❌ No scope label");
      }
      return;
    }

    const expected = `${SCOPE_LABEL_PREFIX}${formAnswers.scope}`;
    if (!labels.scopeLabels.includes(expected)) {
      record(
        `❌ Missing scope label: ${expected}`,
        `gh issue edit ${issueNumber} --add-label ${expected}`,
      );
    }
  }

  /** Exactly one source label. */
  private checkSourceLabel(
    issueNumber: string,
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const sourceLabel = labels.sourceLabels[0];
    const isValid =
      labels.sourceLabels.length === 1 &&
      sourceLabel !== undefined &&
      SOURCE_LABELS.includes(sourceLabel);

    if (isValid) {
      return;
    }

    const found =
      labels.sourceLabels.length === 0 ? "none" : labels.sourceLabels.join(" ");

    record(
      `❌ Expected exactly one source label: ${SOURCE_LABELS.join(" or ")} (found: ${found})`,
      ...labels.sourceLabels.map(
        (label) => `gh issue edit ${issueNumber} --remove-label ${label}`,
      ),
      "add exactly one source label, either:",
      ...SOURCE_LABELS.map(
        (label) => `gh issue edit ${issueNumber} --add-label ${label}`,
      ),
    );
  }

  /** Exactly one type label matching form submission if present. */
  private checkTypeLabel(
    options: {
      readonly formAnswers: IssueFormAnswers;
      readonly issueNumber: string;
    },
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const { formAnswers, issueNumber } = options;

    if (formAnswers.type === undefined) {
      this.checkTypeLabelPresence(issueNumber, labels, record);
      return;
    }

    const expected = `${TYPE_LABEL_PREFIX}${formAnswers.type}`;
    const hasExpected = labels.typeLabels.includes(expected);
    if (labels.typeLabels.length === 1 && hasExpected) {
      return;
    }

    const found =
      labels.typeLabels.length === 0 ? "none" : labels.typeLabels.join(" ");
    record(
      `❌ Expected exactly one type label: ${expected} (found: ${found})`,
      ...labels.typeLabels
        .filter((label) => label !== expected)
        .map((label) => `gh issue edit ${issueNumber} --remove-label ${label}`),
      ...(hasExpected
        ? []
        : [`gh issue edit ${issueNumber} --add-label ${expected}`]),
    );
  }

  /** Exactly one type label when no form answer was submitted. */
  private checkTypeLabelPresence(
    issueNumber: string,
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    if (labels.typeLabels.length === 1) {
      return;
    }

    const found =
      labels.typeLabels.length === 0 ? "none" : labels.typeLabels.join(" ");
    record(
      `❌ Expected exactly one type label (found: ${found})`,
      ...labels.typeLabels
        .slice(1)
        .map((label) => `gh issue edit ${issueNumber} --remove-label ${label}`),
    );
  }

  /** Traverses parent issue links and returns the total depth from root. */
  private computeHierarchyDepth(
    startIssueNumber: number,
    parentNumber: number,
    issueMap: Map<number, IssueSummary>,
  ): number {
    let depth = 1;
    let currentParent: number | undefined = parentNumber;
    const seen = new Set<number>([startIssueNumber]);

    while (currentParent !== undefined) {
      if (seen.has(currentParent)) {
        break;
      }
      seen.add(currentParent);
      depth += 1;

      const ancestor = issueMap.get(currentParent);
      currentParent =
        ancestor === undefined
          ? undefined
          : this.extractParentIssueNumber(ancestor.body);
    }

    return depth;
  }

  /** Reads one dropdown field's answer out of a rendered issue-form body. */
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

  /** Checks if the issue signals a breaking change. */
  private hasBreakingMarker(
    body: string,
    titleMatch: null | RegExpExecArray,
  ): boolean {
    return (
      titleMatch?.groups?.["breaking"] === "!" ||
      body.includes("BREAKING CHANGE:") ||
      body.includes("BREAKING-CHANGE:")
    );
  }

  /** Whether this value can be read by property name at all. */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  /** Every label name, with the nameless entries dropped. */
  private readLabelNames(entries: unknown[]): string[] {
    return entries
      .map((entry) => {
        if (typeof entry === "string") {
          return entry.trim();
        }
        if (!this.isRecord(entry)) {
          return "";
        }
        const name = entry["name"];
        return typeof name === "string" ? name.trim() : "";
      })
      .filter((name) => name !== "");
  }

  /** Resolves non-breaking release level from type labels or title match. */
  private resolveStandardReleaseLevel(
    labelNames: readonly string[],
    titleMatch: null | RegExpExecArray,
  ): { readonly level: string; readonly rank: number; readonly type: string } {
    const typeLabel = labelNames.find((name) =>
      name.startsWith(TYPE_LABEL_PREFIX),
    );
    const resolvedType =
      titleMatch?.[1] ??
      (typeLabel === undefined
        ? "chore"
        : typeLabel.slice(TYPE_LABEL_PREFIX.length));

    const level = TYPE_RELEASE_LEVEL[resolvedType] ?? "none";
    const rank = RELEASE_LEVEL_RANK[level] ?? 0;

    return { level, rank, type: resolvedType };
  }

  // 🌎 Public Methods

  /** Validates metadata and hierarchy across a batch of open issues. */
  public checkBulkIssues(issues: readonly IssueSummary[]): BulkIssuesVerdict {
    const failures: string[] = [];
    let failureCount = 0;

    for (const issue of issues) {
      const formAnswers = this.parseFormAnswers(issue.body);
      const verdict = this.checkMetadata({
        formAnswers,
        issueNumber: String(issue.number),
        metadata: {
          body: issue.body,
          labelNames: issue.labels.map((label) => label.name),
        },
      });

      if (verdict.failures.length > 0) {
        failureCount += 1;
        for (const failure of verdict.failures) {
          failures.push(`Issue #${issue.number}: ${failure}`);
        }
      }
    }

    const hierarchyViolations = this.checkHierarchy(issues);
    if (hierarchyViolations.length > 0) {
      failureCount += hierarchyViolations.length;
      for (const violation of hierarchyViolations) {
        failures.push(`Hierarchy violation: ${violation.message}`);
      }
    }

    return {
      failureCount,
      failures,
      hierarchyViolations,
      totalIssues: issues.length,
    };
  }

  /**
   * Checks issue hierarchy rules (release significance and max depth 3).
   */
  public checkHierarchy(
    issues: readonly IssueSummary[],
  ): readonly HierarchyViolation[] {
    const issueMap = new Map<number, IssueSummary>();
    for (const issue of issues) {
      issueMap.set(issue.number, issue);
    }

    const violations: HierarchyViolation[] = [];

    for (const issue of issues) {
      const parentNumber = this.extractParentIssueNumber(issue.body);
      if (parentNumber === undefined) {
        continue;
      }

      const parent = issueMap.get(parentNumber);
      if (parent === undefined) {
        continue;
      }

      this.checkReleaseSignificanceViolation(issue, parent, violations);

      const depth = this.computeHierarchyDepth(
        issue.number,
        parentNumber,
        issueMap,
      );
      if (depth > MAX_HIERARCHY_DEPTH) {
        violations.push({
          childNumber: issue.number,
          message: `Hierarchy depth of issue #${issue.number} is ${depth}, exceeding maximum depth of ${MAX_HIERARCHY_DEPTH} (Spec -> PR -> Commit)`,
          parentNumber: parent.number,
        });
      }
    }

    return violations;
  }

  /** Every way this issue's labels disagree with it. */
  public checkMetadata(options: {
    readonly formAnswers: IssueFormAnswers;
    readonly issueNumber: string;
    readonly metadata: IssueMetadata;
  }): MetadataVerdict {
    const failures: string[] = [];
    const remediationCommands: string[] = [];
    const labels = this.groupLabels(options.metadata.labelNames);
    const record = (failure: string, ...commands: string[]): void => {
      failures.push(failure);
      remediationCommands.push(...commands);
    };

    this.checkTypeLabel(options, labels, record);
    this.checkScopeLabels(options, labels, record);
    this.checkSourceLabel(options.issueNumber, labels, record);

    return { failures, remediationCommands };
  }

  /** Whatever went wrong, as the one line a report can carry. */
  public describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Extracts the parent issue number referenced in an issue body. */
  public extractParentIssueNumber(body: string): number | undefined {
    const match = PARENT_ISSUE_PATTERN.exec(body);
    const parentNumberString = match?.groups?.["parentNumber"];

    if (parentNumberString === undefined) {
      return undefined;
    }

    const parentNumber = Number.parseInt(parentNumberString, 10);
    return Number.isNaN(parentNumber) ? undefined : parentNumber;
  }

  /** Sorts one issue's labels into the families the checks ask about. */
  public groupLabels(labelNames: readonly string[]): GroupedLabels {
    return {
      scopeLabels: labelNames.filter((name) =>
        name.startsWith(SCOPE_LABEL_PREFIX),
      ),
      sourceLabels: labelNames.filter((name) =>
        name.startsWith(SOURCE_LABEL_PREFIX),
      ),
      typeLabels: labelNames.filter((name) =>
        name.startsWith(TYPE_LABEL_PREFIX),
      ),
    };
  }

  /** Reads Type and Scope answers out of a rendered form body. */
  public parseFormAnswers(body: string): IssueFormAnswers {
    const type = this.extractFormField(body, TYPE_FIELD_LABEL);
    const scope = this.extractFormField(body, SCOPE_FIELD_LABEL);

    return {
      ...(type === undefined ? {} : { type }),
      ...(scope === undefined ? {} : { scope }),
    };
  }

  /** Reads the metadata out of a `gh issue view` document. */
  public resolveFromDocument(documentText: string): IssueMetadataResolution {
    let issue: unknown;

    try {
      issue = JSON.parse(documentText);
    } catch (error) {
      return {
        failure: `❌ Unable to parse the gh issue view output: ${this.describeError(error)}`,
        resolved: false,
      };
    }

    const document: Record<string, unknown> = this.isRecord(issue) ? issue : {};

    return {
      metadata: {
        body: typeof document["body"] === "string" ? document["body"] : "",
        labelNames: this.readLabelNames(
          Array.isArray(document["labels"]) ? document["labels"] : [],
        ),
      },
      resolved: true,
    };
  }

  /** Reads the metadata out of the two environment documents. */
  public resolveFromEnvironment(options: {
    readonly body: string;
    readonly labelsDocument: string;
  }): IssueMetadataResolution {
    let parsedLabels: unknown;

    try {
      parsedLabels = JSON.parse(options.labelsDocument);
    } catch (error) {
      return {
        failure: `❌ Unable to parse ISSUE_LABELS as JSON: ${this.describeError(error)}`,
        resolved: false,
      };
    }

    if (!Array.isArray(parsedLabels)) {
      return {
        failure: "❌ Expected ISSUE_LABELS to be a JSON array",
        resolved: false,
      };
    }

    return {
      metadata: {
        body: options.body,
        labelNames: this.readLabelNames(parsedLabels),
      },
      resolved: true,
    };
  }

  /** Resolves release level and rank from title, body, and labels. */
  public resolveIssueReleaseLevel(issue: {
    readonly body: string;
    readonly labelNames: readonly string[];
    readonly title: string;
  }): { readonly level: string; readonly rank: number; readonly type: string } {
    const titleMatch = CONVENTIONAL_ISSUE_TITLE_PATTERN.exec(issue.title);

    if (this.hasBreakingMarker(issue.body, titleMatch)) {
      return {
        level: "major",
        rank: RELEASE_LEVEL_RANK["major"] ?? 3,
        type: titleMatch?.[1] ?? "feat",
      };
    }

    return this.resolveStandardReleaseLevel(issue.labelNames, titleMatch);
  }
}
