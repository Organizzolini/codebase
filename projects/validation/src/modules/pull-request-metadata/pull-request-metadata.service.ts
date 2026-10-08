import { Injectable } from "@nestjs/common";

import {
  CONVENTIONAL_TITLE_PATTERN,
  DO_NOT_MERGE_LABEL,
  SCOPE_LABEL_PREFIX,
  SOURCE_LABEL_PREFIX,
  SOURCE_LABELS,
  TITLE_SCOPE_SEPARATOR_PATTERN,
  TYPE_LABEL_PREFIX,
} from "./pull-request-metadata.constants";

import type {
  GroupedLabels,
  MetadataVerdict,
  PullRequestMetadata,
  PullRequestMetadataResolution,
  TitleConvention,
} from "./pull-request-metadata.types";

/**
 * Reads a pull request's metadata and says whether it agrees with its title.
 *
 * Pure throughout: every method is a function of what it is handed, so the
 * whole rule set is testable without a pull request, a token, or a network.
 * Reading the metadata from GitHub is the command's job, not this one's.
 */
@Injectable()
export class PullRequestMetadataService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The scope labels must be exactly the title's scopes, in both directions.
   *
   * A title with no scope names no expected labels, which would make both
   * loops vacuous: the forward one would find nothing missing and pass in
   * silence, and the reverse one would denounce every scope label the pull
   * request legitimately carries. So the missing scope is recorded as its own
   * single failure and the comparison is skipped entirely — there is nothing
   * to compare against until the title is fixed.
   */
  private checkScopeLabels(
    options: {
      readonly pullRequestNumber: string;
      readonly titleConvention: TitleConvention;
    },
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const { scopes, type } = options.titleConvention;

    if (scopes.length === 0) {
      record(`❌ No scope in title: retitle as ${type}(<scope>): …`);
      return;
    }

    for (const scope of scopes) {
      if (!labels.scopeLabels.includes(`${SCOPE_LABEL_PREFIX}${scope}`)) {
        record(
          `❌ Missing scope label: ${SCOPE_LABEL_PREFIX}${scope}`,
          `gh pr edit ${options.pullRequestNumber} --add-label ${SCOPE_LABEL_PREFIX}${scope}`,
        );
      }
    }

    for (const scopeLabel of labels.scopeLabels) {
      if (!scopes.includes(scopeLabel.slice(SCOPE_LABEL_PREFIX.length))) {
        record(
          `❌ Unexpected scope label: ${scopeLabel}`,
          `gh pr edit ${options.pullRequestNumber} --remove-label ${scopeLabel}`,
        );
      }
    }
  }

  /**
   * Exactly one source label, and it is one of the two that exist.
   *
   * Unlike the type and scope labels there is nothing in the title to compare
   * this against: the source declares who opened the pull request, so every
   * other `source:` label is simply unexpected. A missing one gets two
   * alternative commands rather than one command carrying a shell comment,
   * because either is right and only a person can say which.
   */
  private checkSourceLabel(
    pullRequestNumber: string,
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
        (label) => `gh pr edit ${pullRequestNumber} --remove-label ${label}`,
      ),
      "add exactly one source label, either:",
      ...SOURCE_LABELS.map(
        (label) => `gh pr edit ${pullRequestNumber} --add-label ${label}`,
      ),
    );
  }

  /** Exactly one type label, and it is the one the title's type names. */
  private checkTypeLabel(
    options: {
      readonly pullRequestNumber: string;
      readonly titleConvention: TitleConvention;
    },
    labels: GroupedLabels,
    record: (failure: string, ...commands: string[]) => void,
  ): void {
    const expected = `${TYPE_LABEL_PREFIX}${options.titleConvention.type}`;
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
        .map(
          (label) =>
            `gh pr edit ${options.pullRequestNumber} --remove-label ${label}`,
        ),
      ...(hasExpected
        ? []
        : [`gh pr edit ${options.pullRequestNumber} --add-label ${expected}`]),
    );
  }

  /** Whether this value can be read by property name at all. */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  /** Reads one label or assignee entry, whichever shape it arrived in. */
  private nameOf(entry: unknown, propertyName: string): string {
    if (typeof entry === "string") {
      return entry.trim();
    }

    if (!this.isRecord(entry)) {
      return "";
    }

    const value = entry[propertyName];

    return typeof value === "string" ? value.trim() : "";
  }

  /** Reads a JSON array, or says why the document was not one. */
  private parseJsonArray(
    documentText: string,
    description: string,
  ): { entries: unknown[] } | { failure: string } {
    let parsed: unknown;

    try {
      parsed = JSON.parse(documentText);
    } catch (error) {
      return {
        failure: `❌ Unable to parse ${description} as JSON: ${this.describeError(error)}`,
      };
    }

    if (!Array.isArray(parsed)) {
      return { failure: `❌ Expected ${description} to be a JSON array` };
    }

    return { entries: parsed };
  }

  /** Every entry's name, with the nameless ones dropped. */
  private readNames(entries: unknown[], propertyName: string): string[] {
    return entries
      .map((entry) => this.nameOf(entry, propertyName))
      .filter((name) => name !== "");
  }

  // 🌎 Public Methods

  /**
   * Every way this pull request's metadata disagrees with its title.
   *
   * The failures are collected rather than thrown one at a time, and each one
   * that has a fix contributes the `gh pr edit` command that applies it.
   */
  public checkMetadata(options: {
    readonly metadata: PullRequestMetadata;
    readonly pullRequestNumber: string;
    readonly titleConvention: TitleConvention;
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

    if (labels.doNotMergePresent) {
      record(
        "❌ Blocked by the do-not-merge label",
        `gh pr edit ${options.pullRequestNumber} --remove-label ${DO_NOT_MERGE_LABEL}`,
      );
    }

    if (options.metadata.assigneeLogins.length === 0) {
      record(
        "❌ No assignee",
        `gh pr edit ${options.pullRequestNumber} --add-assignee @me`,
      );
    }

    this.checkSourceLabel(options.pullRequestNumber, labels, record);

    return { failures, remediationCommands };
  }

  /** Whatever went wrong, as the one line a report can carry. */
  public describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Sorts one pull request's labels into the families the checks ask about. */
  public groupLabels(labelNames: readonly string[]): GroupedLabels {
    return {
      doNotMergePresent: labelNames.includes(DO_NOT_MERGE_LABEL),
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

  /**
   * Reads the type and scopes out of a conventional title.
   *
   * A title that does not parse at all returns `undefined`, which the caller
   * reports; a title that parses with no scope group returns an empty scope
   * list, which is a check failure rather than a parse failure.
   */
  public parseTitle(title: string): TitleConvention | undefined {
    const match = CONVENTIONAL_TITLE_PATTERN.exec(title.trim());
    const titleType = match?.[1];

    if (match === null || titleType === undefined) {
      return undefined;
    }

    const scopes = [
      ...new Set(
        (match[2] ?? "")
          .split(TITLE_SCOPE_SEPARATOR_PATTERN)
          .map((scope) => scope.trim().toLowerCase())
          .filter((scope) => scope !== ""),
      ),
    ];

    return { scopes, type: titleType };
  }

  /** Reads the metadata out of a `gh pr view` document. */
  public resolveFromDocument(
    documentText: string,
  ): PullRequestMetadataResolution {
    let pullRequest: unknown;

    try {
      pullRequest = JSON.parse(documentText);
    } catch (error) {
      return {
        failure: `❌ Unable to parse the gh pr view output: ${this.describeError(error)}`,
        resolved: false,
      };
    }

    const document: Record<string, unknown> = this.isRecord(pullRequest)
      ? pullRequest
      : {};

    return {
      metadata: {
        assigneeLogins: this.readNames(
          Array.isArray(document["assignees"]) ? document["assignees"] : [],
          "login",
        ),
        labelNames: this.readNames(
          Array.isArray(document["labels"]) ? document["labels"] : [],
          "name",
        ),
        title: typeof document["title"] === "string" ? document["title"] : "",
      },
      resolved: true,
    };
  }

  /** Reads the metadata out of the three environment documents. */
  public resolveFromEnvironment(options: {
    readonly assigneesDocument: string;
    readonly labelsDocument: string;
    readonly title: string;
  }): PullRequestMetadataResolution {
    const labels = this.parseJsonArray(
      options.labelsDocument,
      "PULL_REQUEST_LABELS",
    );

    if ("failure" in labels) {
      return { failure: labels.failure, resolved: false };
    }

    const assignees = this.parseJsonArray(
      options.assigneesDocument,
      "PULL_REQUEST_ASSIGNEES",
    );

    if ("failure" in assignees) {
      return { failure: assignees.failure, resolved: false };
    }

    return {
      metadata: {
        assigneeLogins: this.readNames(assignees.entries, "login"),
        labelNames: this.readNames(labels.entries, "name"),
        title: options.title,
      },
      resolved: true,
    };
  }
}
