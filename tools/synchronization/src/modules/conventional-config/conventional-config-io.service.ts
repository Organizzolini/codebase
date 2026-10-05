/**
 * I/O, parsing, and formatting operations for conventional config sync.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import JSON5 from "json5";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import { RELEASE_RULES_SPECIAL_TYPES } from "./conventional-config.constants";

import type {
  ConventionalConfig,
  EntryWithDescription,
  ReleaseConfig,
  Scope,
  Type,
} from "./conventional-config.types";

/**
 * Provides all I/O, parsing, and formatting operations for the conventional-config sync workflow.
 */
@Injectable()
export class ConventionalConfigIoService {
  // 🏗 Dependency Injection

  constructor(private readonly loggerService: LoggerService) {
    this.loggerService.setContext(ConventionalConfigIoService.name);
  }

  // 🔐 Private Fields

  private readonly workspaceRoot = process.cwd();

  private readonly releaseConfigFile = path.join(
    this.workspaceRoot,
    "configuration/release.config.cjs",
  );

  private readonly requireFromCurrentModule = createRequire(import.meta.url);

  private readonly settingsFile = path.join(
    this.workspaceRoot,
    ".vscode/settings.json",
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Capitalizes the first character of a string. */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Rewrites a single dropdown's options within a marked block. */
  private writeIssueTemplateDropdown(options: {
    marker: "scopes" | "types";
    templateContent: string;
    templateName: string;
    values: string[];
  }): string {
    const { marker, templateContent, templateName, values } = options;
    const dropdownOptions = this.generateYamlDropdownOptions(values);
    const pattern = new RegExp(
      String.raw`(# <!-- ${marker}-start -->\n[\s\S]*?options:\n)[\s\S]*?(\s*validations:[\s\S]*?# <!-- ${marker}-end -->)`,
    );
    const match = pattern.exec(templateContent);
    if (!match) {
      throw new Error(`Could not find ${marker} markers in ${templateName}`);
    }

    return templateContent.replace(pattern, `$1${dropdownOptions}$2`);
  }

  // 🌎 Public Methods

  /**
   * Appends missing preset type entries into semantic-release preset config.
   */
  appendToPresetTypes(
    content: string,
    missingTypes: string[],
    sourceTypes: Type[],
  ): string {
    if (missingTypes.length === 0) return content;
    const newEntries = missingTypes
      .map((t) => {
        const entry = sourceTypes.find((s) => s.name === t);
        const desc = entry
          ? ` // ${entry.description}`
          : " // ⚠️ Added by sync — add description";
        return `            { type: "${t}", section: "⚠️ ${this.capitalize(t)}", hidden: true },${desc}`;
      })
      .join("\n");
    return content.replace(
      /(presetConfig:\s*\{[\s\S]*?types:\s*\[[\s\S]*?)(\s*\],\s*\})/,
      `$1\n${newEntries}$2`,
    );
  }

  /**
   * Appends missing release rule entries into semantic-release config.
   */
  appendToReleaseRules(content: string, missingTypes: string[]): string {
    if (missingTypes.length === 0) return content;
    const newEntries = missingTypes
      .map(
        (t) =>
          `          { type: "${t}", release: false }, // ⚠️ Added by sync — set appropriate release level`,
      )
      .join("\n");
    return content.replace(
      /(releaseRules:\s*\[[\s\S]*?)(\s*\],)/,
      `$1\n${newEntries}$2`,
    );
  }

  /**
   * Extracts text content between named HTML comment markers.
   */
  extractMarkerContent(
    content: string,
    markerName: string,
  ): string | undefined {
    const pattern = new RegExp(
      String.raw`<!-- ${markerName}-start -->\n([\s\S]*?)<!-- ${markerName}-end -->`,
    );
    const match = pattern.exec(content);
    return match?.[1];
  }

  /**
   * Formats scope list for VS Code settings JSON with inline descriptions.
   */
  formatScopesForSettings(scopes: Scope[]): string {
    return scopes
      .map((scope, index) => {
        const comma = index < scopes.length - 1 ? "," : "";
        return `    "${scope.name}"${comma} // ${scope.description}`;
      })
      .join("\n");
  }

  /**
   * Builds a markdown table from value-description pairs.
   */
  generateMarkdownTable(
    entries: EntryWithDescription[],
    header: { column1: string; column2: string },
  ): string {
    const lines = [
      `| ${header.column1} | ${header.column2} |`,
      `| ${"-".repeat(header.column1.length)} | ${"-".repeat(header.column2.length)} |`,
    ];
    for (const entry of entries) {
      lines.push(`| \`${entry.value}\` | ${entry.description} |`);
    }
    return lines.join("\n");
  }

  /**
   * Generates YAML list items for a dropdown's options.
   */
  generateYamlDropdownOptions(values: string[]): string {
    return values.map((value) => `        - ${value}`).join("\n");
  }

  /**
   * Reads commit type names configured in release preset sections.
   */
  getPresetConfigTypes(config: ReleaseConfig): string[] {
    return config.plugins[1][1].presetConfig.types.map((t) => t.type);
  }

  /**
   * Reads commit type names configured in semantic-release rules.
   */
  getReleaseRulesTypes(config: ReleaseConfig): string[] {
    return config.plugins[0][1].releaseRules
      .map((r) => r.type)
      .filter((t): t is string => t !== undefined);
  }

  /**
   * Parses dropdown options from a marked block of issue template YAML.
   */
  parseIssueTemplateDropdown(
    content: string,
    marker: "scopes" | "types",
  ): string[] {
    const pattern = new RegExp(
      String.raw`# <!-- ${marker}-start -->\n[\s\S]*?options:\n([\s\S]*?)\n\s*validations:[\s\S]*?# <!-- ${marker}-end -->`,
    );
    const match = pattern.exec(content);
    if (!match?.[1]) return [];

    const values: string[] = [];
    for (const line of match[1].split("\n")) {
      const valueMatch = /^\s{8}-\s+(.+)$/.exec(line);
      if (valueMatch?.[1]) {
        values.push(valueMatch[1]);
      }
    }
    return values;
  }

  /**
   * Parses first-column values from a markdown table body.
   */
  parseMarkdownTableValues(tableContent: string): string[] {
    const values: string[] = [];
    for (const line of tableContent.split("\n")) {
      const match = /^\|\s*`([^`]+)`\s*\|/.exec(line);
      if (match?.[1]) {
        values.push(match[1]);
      }
    }
    return values;
  }

  /**
   * Parses conventional commit scopes from VS Code settings content.
   */
  parseSettingsScopes(content: string): string[] {
    const settings = JSON5.parse<Record<string, unknown>>(content);
    const scopes = settings["conventionalCommits.scopes"];
    if (!Array.isArray(scopes)) {
      throw new TypeError(
        'Could not find "conventionalCommits.scopes" array in settings.json',
      );
    }
    return scopes as string[];
  }

  /**
   * Replaces content inside named marker block with generated content.
   */
  replaceMarkerContent(
    content: string,
    markerName: string,
    newContent: string,
  ): string {
    const pattern = new RegExp(
      String.raw`(<!-- ${markerName}-start -->\n)[\s\S]*?(<!-- ${markerName}-end -->)`,
    );
    return content.replace(pattern, `$1\n${newContent}\n\n$2`);
  }

  /**
   * Rewrites the type and scope dropdown options in a GitHub issue template file.
   */
  writeIssueTemplateSync(
    config: ConventionalConfig,
    templateFile: string,
  ): void {
    const templateName = path.relative(this.workspaceRoot, templateFile);
    this.loggerService.info("🔄 Syncing type and scope dropdowns", undefined, {
      templateName,
    });
    let templateContent = readFileSync(templateFile, "utf8");

    templateContent = this.writeIssueTemplateDropdown({
      marker: "types",
      templateContent,
      templateName,
      values: config.types.map((type) => type.name),
    });
    templateContent = this.writeIssueTemplateDropdown({
      marker: "scopes",
      templateContent,
      templateName,
      values: config.scopes.map((scope) => scope.name),
    });

    writeFileSync(templateFile, templateContent, "utf8");
    this.loggerService.info("📇 Synced types and scopes", undefined, {
      templateName,
    });
  }

  /**
   * Updates release.config.cjs with missing release rules and preset types.
   */
  writeReleaseConfigSync(sourceTypes: Type[]): void {
    const relativeFile = path.relative(
      this.workspaceRoot,
      this.releaseConfigFile,
    );
    this.loggerService.info("🔄 Syncing types", undefined, { relativeFile });

    const releaseConfig = this.requireFromCurrentModule(
      this.releaseConfigFile,
    ) as ReleaseConfig;

    const sourceTypeNames = sourceTypes.map((t) => t.name);
    const releaseRulesCheckTypes = sourceTypeNames.filter(
      (t) => !RELEASE_RULES_SPECIAL_TYPES.has(t),
    );
    const missingFromReleaseRules = _.difference(
      releaseRulesCheckTypes,
      this.getReleaseRulesTypes(releaseConfig),
    );
    const missingFromPresetTypes = _.difference(
      sourceTypeNames,
      this.getPresetConfigTypes(releaseConfig),
    );
    let content = readFileSync(this.releaseConfigFile, "utf8");
    content = this.appendToReleaseRules(content, missingFromReleaseRules);
    content = this.appendToPresetTypes(
      content,
      missingFromPresetTypes,
      sourceTypes,
    );
    writeFileSync(this.releaseConfigFile, content, "utf8");
    this.loggerService.info("🏷️ Synced types", undefined, { relativeFile });
  }

  /**
   * Rewrites VS Code settings conventional scope array from source scopes.
   */
  writeSettingsSync(scopes: Scope[]): void {
    this.loggerService.info("🔄 Syncing settings.json scopes");
    const settingsContent = readFileSync(this.settingsFile, "utf8");
    const formattedBlock = this.formatScopesForSettings(scopes);

    const scopesPattern =
      /("conventionalCommits\.scopes":\s*\[)([\s\S]*?)(\s*\])/;
    const match = scopesPattern.exec(settingsContent);
    if (!match) {
      throw new Error(
        'Could not find "conventionalCommits.scopes" array in settings.json',
      );
    }

    const updatedContent = settingsContent.replace(
      scopesPattern,
      `$1\n${formattedBlock}\n  ]`,
    );

    writeFileSync(this.settingsFile, updatedContent, "utf8");
    this.loggerService.info("📇 Synced scopes in settings.json");
  }

  /**
   * Rewrites a skill file's types and scopes markdown tables.
   */
  writeSkillSync(
    config: { scopes: Scope[]; types: Type[] },
    skillFile: string,
  ): void {
    const skillName = path.relative(this.workspaceRoot, skillFile);
    this.loggerService.info("🔄 Syncing types and scopes", undefined, {
      skillName,
    });
    let skillContent = readFileSync(skillFile, "utf8");

    const typesEntries: EntryWithDescription[] = config.types.map((type) => ({
      description: type.description,
      value: type.name,
    }));
    const scopesEntries: EntryWithDescription[] = config.scopes.map(
      (scope) => ({
        description: scope.description,
        value: scope.name,
      }),
    );

    const typesTable = this.generateMarkdownTable(typesEntries, {
      column1: "Type",
      column2: "Description",
    });
    const scopesTable = this.generateMarkdownTable(scopesEntries, {
      column1: "Scope",
      column2: "Description",
    });

    skillContent = this.replaceMarkerContent(skillContent, "types", typesTable);
    skillContent = this.replaceMarkerContent(
      skillContent,
      "scopes",
      scopesTable,
    );

    writeFileSync(skillFile, skillContent, "utf8");
    this.loggerService.info("📇 Synced types and scopes", undefined, {
      skillName,
    });
  }
}
