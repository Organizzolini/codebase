import { Injectable } from "@nestjs/common";

import {
  ABSENT_LABEL,
  LIMIT_TABLE_COLUMNS,
  LIMITS_HEADING,
  LIMITS_SUMMARY,
  NO_LIMIT_LABEL,
  ROOT_PROJECT_LABEL,
  WORKSPACE_LABEL,
} from "./limits.constants";

import type { ProjectLimitRow } from "./limits.types";

/**
 * Turns the resolved limits into the document a reader gets.
 *
 * Markdown, because the listing is a table and everything else callidescope
 * prints is already markdown — it reads in a terminal and pastes into a pull
 * request unchanged. Kept apart from the service so the shape of the document
 * is testable with no configuration anywhere near it, and so resolving the
 * limits never depends on how they will be shown.
 */
@Injectable()
export class RenderLimitsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Names the project a row is about.
   *
   * Two kinds of row carry no directory to print, for two different reasons:
   * the workspace default belongs to no project at all, and the project rooted
   * at the workspace root has the empty string for a root.
   */
  private renderProject(project: string | undefined): string {
    if (project === undefined) {
      return WORKSPACE_LABEL;
    }

    return project === "" ? ROOT_PROJECT_LABEL : project;
  }

  /** Renders one markdown table row. */
  private renderRow(cells: readonly string[]): string {
    return `| ${cells.join(" | ")} |`;
  }

  /** Renders every resolved limit as one row apiece. */
  private renderTable(rows: readonly ProjectLimitRow[]): string {
    return [
      this.renderRow(LIMIT_TABLE_COLUMNS),
      this.renderRow(LIMIT_TABLE_COLUMNS.map(() => "---")),
      ...rows.map((row) =>
        this.renderRow([
          this.renderProject(row.project),
          `\`${row.limit}\``,
          row.value === undefined ? NO_LIMIT_LABEL : String(row.value),
          row.path === undefined ? ABSENT_LABEL : `\`${row.path}\``,
        ]),
      ),
    ].join("\n");
  }

  // 🌎 Public Methods

  /** Renders the listing. */
  public render(rows: readonly ProjectLimitRow[]): string {
    return [
      LIMITS_HEADING,
      "",
      LIMITS_SUMMARY,
      "",
      this.renderTable(rows),
    ].join("\n");
  }
}
