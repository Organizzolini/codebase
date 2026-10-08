import { Injectable } from "@nestjs/common";

import {
  CONFIGURATION_HEADING,
  LIMIT_TABLE_COLUMNS,
} from "./configuration-listing.constants";

import type {
  ConfiguredDirectory,
  ConfiguredLimitRow,
  RenderConfigurationArguments,
} from "./configuration-listing.types";

/**
 * Turns a resolved configuration listing into the document a reader gets.
 *
 * Markdown by default because the listing is a table and a repository already
 * reads codometer's output as markdown; JSON when something downstream parses
 * it. Kept apart from the command so the shape of the document is testable
 * without a command line, and apart from the service so gathering the
 * configuration never depends on how it will be shown.
 */
@Injectable()
export class RenderConfigurationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders everything one configuration file resolved to. */
  private renderDirectory(entry: ConfiguredDirectory): string {
    const { configuration } = entry;

    if (configuration === undefined) {
      return [
        `## ${entry.directory}`,
        "",
        `Declared in \`${entry.path}\`.`,
        "",
        `- ⚠️ Could not be read: ${entry.error ?? "unknown error"}`,
      ].join("\n");
    }

    return [
      `## ${entry.directory}`,
      "",
      `Declared in \`${entry.path}\`.`,
      "",
      `- Inputs: ${this.renderNames(configuration.inputs.map((input) => input.name))}`,
      `- Limits: ${String(configuration.limits.length)}`,
      `- Custom statistics: ${this.renderNames(configuration.custom.map((statistic) => statistic.label))}`,
      `- Python command: \`${configuration.python.command}\``,
      `- Excluded globs: ${String(configuration.exclude.length)}`,
      `- Exclude files: ${this.renderNames(configuration.excludeFrom)}`,
    ].join("\n");
  }

  /** Renders the limits as a markdown table, or a line saying there are none. */
  private renderLimitsTable(rows: readonly ConfiguredLimitRow[]): string {
    if (rows.length === 0) {
      return "No limits are configured.";
    }

    return [
      this.renderRow(LIMIT_TABLE_COLUMNS),
      this.renderRow(LIMIT_TABLE_COLUMNS.map(() => "---")),
      ...rows.map((row) =>
        this.renderRow([
          row.directory,
          `\`${row.metric}\``,
          row.label,
          row.severity,
          row.value,
          `\`${row.path}\``,
        ]),
      ),
    ].join("\n");
  }

  /** Renders a list of names, or an em dash when the list is empty. */
  private renderNames(names: readonly string[]): string {
    return names.length === 0 ? "—" : names.join(", ");
  }

  /**
   * Renders why nothing answered for the walk root, when nothing did.
   *
   * Nothing at all otherwise, so the caller's line list is unchanged. Said at
   * the top of the document rather than left out: every limit below is still
   * real, but the walk that found them ran on the built-in exclusions rather
   * than the ones this repository declares.
   */
  private renderRootError(rootError: string | undefined): string[] {
    if (rootError === undefined) {
      return [];
    }

    return [
      `- ⚠️ Nothing answered for the walk root, so the built-in exclusions were used instead: ${rootError}`,
      "",
    ];
  }

  /** Renders one markdown table row, escaping nothing a path may not hold. */
  private renderRow(cells: readonly string[]): string {
    return `| ${cells.join(" | ")} |`;
  }

  // 🌎 Public Methods

  /** Renders the listing in the requested format. */
  public render(args: RenderConfigurationArguments): string {
    if (args.format === "json") {
      return JSON.stringify(
        args.limitsOnly
          ? { limits: args.limitRows, rootError: args.rootError ?? null }
          : {
              configurations: args.described,
              rootError: args.rootError ?? null,
            },
        undefined,
        2,
      );
    }

    if (args.limitsOnly) {
      return [
        `${CONFIGURATION_HEADING}: Limits`,
        "",
        ...this.renderRootError(args.rootError),
        this.renderLimitsTable(args.limitRows),
      ].join("\n");
    }

    return [
      CONFIGURATION_HEADING,
      "",
      ...this.renderRootError(args.rootError),
      ...args.described.map((entry) => this.renderDirectory(entry)),
      "",
      `${CONFIGURATION_HEADING}: Limits`.replace("# 🔧", "## 🔧"),
      "",
      this.renderLimitsTable(args.limitRows),
    ].join("\n");
  }
}
