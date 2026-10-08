/**
 * Orchestration service for the conventional-config sync workflow.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import { ConventionalConfigIoService } from "./conventional-config-io.service";
import { ConventionalConfigValidatorsService } from "./conventional-config-validators.service";
import {
  SYNC_CONVENTIONAL_CONFIG_ISSUE_TEMPLATE_FILES,
  SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES,
} from "./conventional-config.constants";

import type {
  ConventionalConfig,
  ReleaseConfig,
  SyncContext,
  Type,
} from "./conventional-config.types";

/**
 * Orchestrates check and write modes for conventional-config synchronization.
 */
@Injectable()
export class ConventionalConfigService {
  // 🏗 Dependency Injection

  constructor(
    private readonly conventionalConfigIoService: ConventionalConfigIoService,
    private readonly loggerService: LoggerService,
    private readonly conventionalConfigValidatorsService: ConventionalConfigValidatorsService,
  ) {
    this.loggerService.setContext(ConventionalConfigService.name);
  }

  // 🔐 Private Fields

  private readonly workspaceRoot = this.resolveWorkspaceRoot();
  private readonly conventionalConfigFile = path.join(
    this.workspaceRoot,
    "configuration/conventional.config.cjs",
  );
  private readonly issueTemplateFiles =
    SYNC_CONVENTIONAL_CONFIG_ISSUE_TEMPLATE_FILES.map((file) =>
      path.join(this.workspaceRoot, file),
    );
  private readonly releaseConfigFile = path.join(
    this.workspaceRoot,
    "configuration/release.config.cjs",
  );
  private readonly requireFromCurrentModule = createRequire(import.meta.url);
  private readonly settingsFile = path.join(
    this.workspaceRoot,
    ".vscode/settings.json",
  );
  private readonly skillFiles = SYNC_CONVENTIONAL_CONFIG_MARKDOWN_FILES.map(
    (file) => path.join(this.workspaceRoot, file),
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Loads release.config.cjs as a CommonJS module. */
  private loadReleaseConfig(): ReleaseConfig {
    return this.requireFromCurrentModule(
      this.releaseConfigFile,
    ) as ReleaseConfig;
  }

  /** Resolves the codebase root from this file location. */
  private resolveWorkspaceRoot(): string {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentFileDirectory = path.dirname(currentFilePath);
    const workspaceRoot = path.resolve(currentFileDirectory, "../../../../..");

    if (!existsSync(path.join(workspaceRoot, "pnpm-workspace.yaml"))) {
      throw new Error("Could not find workspace root (pnpm-workspace.yaml)");
    }

    return workspaceRoot;
  }

  /** Writes release config when commit types are missing in release rules or preset config. */
  private syncReleaseConfigIfNeeded(args: {
    sourceTypes: Type[];
    typeNames: string[];
  }): void {
    const { sourceTypes, typeNames } = args;
    const releaseConfig = this.loadReleaseConfig();
    const releaseRulesCheckTypes = typeNames.filter(
      (typeName) => !new Set(["revert"]).has(typeName),
    );
    const missingFromReleaseRules = _.difference(
      releaseRulesCheckTypes,
      this.conventionalConfigIoService.getReleaseRulesTypes(releaseConfig),
    );
    const missingFromPresetTypes = _.difference(
      typeNames,
      this.conventionalConfigIoService.getPresetConfigTypes(releaseConfig),
    );

    if (
      missingFromReleaseRules.length > 0 ||
      missingFromPresetTypes.length > 0
    ) {
      this.conventionalConfigIoService.writeReleaseConfigSync(sourceTypes);
    }
  }

  // 🌎 Public Methods

  /**
   * Check mode: validates all configuration files are in sync with
   * conventional.config.cjs, reporting success rather than exiting so the
   * aggregate `synchronization` command can collect every result.
   */
  handleCheckMode(context: SyncContext): boolean {
    const { config, scopeNames, settingsScopes, typeNames } = context;
    const settingsOk =
      this.conventionalConfigValidatorsService.checkSettingsSync(
        scopeNames,
        settingsScopes,
      );
    const skillsOk =
      this.conventionalConfigValidatorsService.checkAllSkillsSync(
        config,
        this.skillFiles,
      );
    const templatesOk =
      this.conventionalConfigValidatorsService.checkAllTemplatesSync(
        config,
        this.issueTemplateFiles,
      );
    const releaseConfig = this.loadReleaseConfig();
    const releaseRulesOk =
      this.conventionalConfigValidatorsService.checkReleaseRulesSync(
        typeNames,
        this.conventionalConfigIoService.getReleaseRulesTypes(releaseConfig),
        "release.config.cjs",
      );
    const presetOk =
      this.conventionalConfigValidatorsService.checkPresetConfigSync(
        typeNames,
        this.conventionalConfigIoService.getPresetConfigTypes(releaseConfig),
        "release.config.cjs",
      );

    this.loggerService.info(
      "📇 Summarized the conventional-config check",
      undefined,
      { presetOk, releaseRulesOk, settingsOk, skillsOk, templatesOk },
    );

    if (
      !settingsOk ||
      !skillsOk ||
      !templatesOk ||
      !releaseRulesOk ||
      !presetOk
    ) {
      this.loggerService.info("💡 Suggested a fix", undefined, {
        hint: "Run 'nx run synchronization:conventional-config:write' to sync",
      });
      return false;
    }
    this.loggerService.info("📇 Verified the conventional commit config");
    return true;
  }

  /**
   * Write mode: updates all out-of-sync configuration files from conventional.config.cjs.
   */
  handleWriteMode(context: SyncContext): void {
    const { config, scopeNames, settingsScopes, typeNames } = context;
    const settingsOk =
      this.conventionalConfigValidatorsService.checkSettingsSync(
        scopeNames,
        settingsScopes,
      );
    const outOfSyncSkills = this.skillFiles.filter(
      (skillFile) =>
        !this.conventionalConfigValidatorsService.checkSkillSync(
          config,
          skillFile,
        ),
    );
    const outOfSyncTemplates = this.issueTemplateFiles.filter(
      (templateFile) =>
        !this.conventionalConfigValidatorsService.checkIssueTemplateSync(
          config,
          templateFile,
        ),
    );

    if (
      settingsOk &&
      outOfSyncSkills.length === 0 &&
      outOfSyncTemplates.length === 0
    ) {
      this.loggerService.info("📇 Verified everything was already in sync");
      return;
    }

    if (!settingsOk) {
      this.conventionalConfigIoService.writeSettingsSync(config.scopes);
    }
    for (const skillFile of outOfSyncSkills) {
      this.conventionalConfigIoService.writeSkillSync(config, skillFile);
    }
    for (const templateFile of outOfSyncTemplates) {
      this.conventionalConfigIoService.writeIssueTemplateSync(
        config,
        templateFile,
      );
    }
    this.syncReleaseConfigIfNeeded({ sourceTypes: config.types, typeNames });
  }

  /**
   * Loads conventional.config.cjs using require() since it's a CommonJS module.
   */
  loadConventionalConfig(): ConventionalConfig {
    return this.requireFromCurrentModule(
      this.conventionalConfigFile,
    ) as ConventionalConfig;
  }

  /**
   * Runs the workflow in check or write mode, reporting whether it succeeded.
   */
  runSynchronization(mode: string): boolean {
    const config = this.loadConventionalConfig();
    const context: SyncContext = {
      config,
      scopeNames: config.scopes.map((scope) => scope.name),
      settingsScopes: this.conventionalConfigIoService.parseSettingsScopes(
        readFileSync(this.settingsFile, "utf8"),
      ),
      typeNames: config.types.map((type) => type.name),
    };

    if (mode === "check") {
      return this.handleCheckMode(context);
    }

    this.handleWriteMode(context);
    return true;
  }
}
