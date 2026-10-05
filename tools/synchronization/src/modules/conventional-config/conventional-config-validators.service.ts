/**
 * Validation functions for checking synchronization of conventional config.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import { ConventionalConfigIoService } from "./conventional-config-io.service";
import { RELEASE_RULES_SPECIAL_TYPES } from "./conventional-config.constants";

import type { ConventionalConfig } from "./conventional-config.types";

/**
 * Provides validation methods that check synchronization of conventional config files.
 */
@Injectable()
export class ConventionalConfigValidatorsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly conventionalConfigIoService: ConventionalConfigIoService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext(ConventionalConfigValidatorsService.name);
  }

  // 🔐 Private Fields

  private readonly workspaceRoot = process.cwd();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Checks that a named marker block in a skill file matches the source config values. */
  private checkMarkerSync(args: {
    config: ConventionalConfig;
    marker: "scopes" | "types";
    skillContent: string;
    skillName: string;
  }): boolean {
    const markerValues = this.readMarkerValues(args);
    if (!markerValues) {
      return false;
    }
    const { config, marker, skillName } = args;
    const { skillValues } = markerValues;
    const sourceValues = this.getSourceValuesForMarker({ config, marker });

    return this.validateMarkerValues({
      marker,
      skillName,
      skillValues,
      sourceValues,
    });
  }

  /** Returns source type or scope names for the given marker kind from the config. */
  private getSourceValuesForMarker(args: {
    config: ConventionalConfig;
    marker: "scopes" | "types";
  }): string[] {
    const { config, marker } = args;
    if (marker === "types") {
      return config.types.map((type) => type.name);
    }
    return config.scopes.map((scope) => scope.name);
  }

  /** Extracts and returns parsed table values from a named marker block, or undefined if missing. */
  private readMarkerValues(args: {
    marker: "scopes" | "types";
    skillContent: string;
    skillName: string;
  }): undefined | { skillValues: string[] } {
    const { marker, skillContent, skillName } = args;
    const markerContent = this.conventionalConfigIoService.extractMarkerContent(
      skillContent,
      marker,
    );
    if (!markerContent) {
      this.loggerService.info("📄 Missing markers", undefined, {
        marker,
        skillName,
      });
      return undefined;
    }

    return {
      skillValues:
        this.conventionalConfigIoService.parseMarkdownTableValues(
          markerContent,
        ),
    };
  }

  /** Logs the items missing from and extra in the target compared to the source. */
  private showDifference(
    source: string[],
    target: string[],
    targetName: string,
  ): void {
    const missing = _.difference(source, target);
    const extra = _.difference(target, source);

    if (missing.length === 0 && extra.length === 0) {
      return;
    }

    this.loggerService.info("🔀 Differing values", undefined, {
      extra,
      missing,
      targetName,
    });
  }

  /** Compares skill marker values against source values and logs any mismatch. */
  private validateMarkerValues(args: {
    marker: "scopes" | "types";
    skillName: string;
    skillValues: string[];
    sourceValues: string[];
  }): boolean {
    const { marker, skillName, skillValues, sourceValues } = args;
    const sortedSource = _.sortBy([...sourceValues]);
    const sortedSkill = _.sortBy([...skillValues]);
    if (!_.isEqual(sortedSource, sortedSkill)) {
      this.loggerService.info("📇 Detected an out-of-sync table", undefined, {
        marker,
        skillName,
      });
      this.showDifference(sourceValues, skillValues, skillName);
      return false;
    }
    if (!_.isEqual(sourceValues, skillValues)) {
      this.loggerService.info("🔀 Reordered a table", undefined, {
        marker,
        skillName,
      });
      return false;
    }
    return true;
  }

  // 🌎 Public Methods

  /**
   * Validates that every configured skill file has synchronized type/scope tables.
   */
  checkAllSkillsSync(
    config: ConventionalConfig,
    skillFiles: string[],
  ): boolean {
    let skillsOk = true;
    for (const skillFile of skillFiles) {
      if (!this.checkSkillSync(config, skillFile)) skillsOk = false;
    }
    return skillsOk;
  }

  /**
   * Validates that all issue templates contain matching type and scope options.
   */
  checkAllTemplatesSync(
    config: ConventionalConfig,
    issueTemplateFiles: string[],
  ): boolean {
    let templatesOk = true;
    for (const templateFile of issueTemplateFiles) {
      if (!this.checkIssueTemplateSync(config, templateFile))
        templatesOk = false;
    }
    return templatesOk;
  }

  /**
   * Validates a single issue template's type and scope dropdowns against
   * configured values and order.
   */
  checkIssueTemplateSync(
    config: ConventionalConfig,
    templateFile: string,
  ): boolean {
    const templateName = path.relative(this.workspaceRoot, templateFile);
    const templateContent = readFileSync(templateFile, "utf8");
    let templateOk = true;
    for (const marker of ["types", "scopes"] as const) {
      const sourceValues = this.getSourceValuesForMarker({ config, marker });
      const templateValues =
        this.conventionalConfigIoService.parseIssueTemplateDropdown(
          templateContent,
          marker,
        );
      if (templateValues.length === 0) {
        this.loggerService.info("📄 Missing markers", undefined, {
          marker,
          templateName,
        });
        templateOk = false;
        continue;
      }
      if (
        !this.validateMarkerValues({
          marker,
          skillName: templateName,
          skillValues: templateValues,
          sourceValues,
        })
      ) {
        templateOk = false;
      }
    }
    return templateOk;
  }

  /**
   * Validates release preset type entries include all configured commit types.
   */
  checkPresetConfigSync(
    sourceTypes: string[],
    presetConfigTypes: string[],
    relativeFile: string,
  ): boolean {
    const missingFromPresetTypes = _.difference(sourceTypes, presetConfigTypes);
    if (missingFromPresetTypes.length > 0) {
      this.loggerService.info(
        "🏷️ Missing presetConfig.types entries",
        undefined,
        { missing: missingFromPresetTypes, relativeFile },
      );
      return false;
    }
    return true;
  }

  /**
   * Validates release rules include all configured commit types except specials.
   */
  checkReleaseRulesSync(
    sourceTypes: string[],
    releaseRulesTypes: string[],
    relativeFile: string,
  ): boolean {
    const releaseRulesCheckTypes = sourceTypes.filter(
      (t) => !RELEASE_RULES_SPECIAL_TYPES.has(t),
    );
    const missingFromReleaseRules = _.difference(
      releaseRulesCheckTypes,
      releaseRulesTypes,
    );
    if (missingFromReleaseRules.length > 0) {
      this.loggerService.info("🏷️ Missing releaseRules entries", undefined, {
        missing: missingFromReleaseRules,
        relativeFile,
      });
      return false;
    }
    return true;
  }

  /**
   * Validates configured commit scopes in settings are value- and order-synced.
   */
  checkSettingsSync(sourceScopes: string[], settingsScopes: string[]): boolean {
    const sortedSource = _.sortBy([...sourceScopes]);
    const sortedTarget = _.sortBy([...settingsScopes]);
    const valuesMatch = _.isEqual(sortedSource, sortedTarget);
    const orderMatches = _.isEqual(sourceScopes, settingsScopes);

    if (!valuesMatch || !orderMatches) {
      this.loggerService.info(
        "📇 Detected out-of-sync scopes in settings.json",
      );
      if (!valuesMatch) {
        this.showDifference(sourceScopes, settingsScopes, "settings.json");
      }
      if (valuesMatch && !orderMatches) {
        this.loggerService.info("🔀 Reordered scopes in settings.json");
      }
      return false;
    }
    return true;
  }

  /**
   * Validates a skill file's type/scope markdown tables against source config.
   */
  checkSkillSync(config: ConventionalConfig, skillFile: string): boolean {
    const skillName = path.relative(this.workspaceRoot, skillFile);
    const skillContent = readFileSync(skillFile, "utf8");
    let inSync = true;
    for (const marker of ["types", "scopes"] as const) {
      if (!this.checkMarkerSync({ config, marker, skillContent, skillName })) {
        inSync = false;
      }
    }
    return inSync;
  }
}
