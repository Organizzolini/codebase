import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import JSON5 from "json5";
import _ from "lodash";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import {
  DEVCONTAINER_CLOUD_ONLY_KEYS,
  DEVCONTAINER_REMOTE_ENVIRONMENT_PRESERVED_KEYS,
  DEVCONTAINER_SYNCED_KEYS,
} from "./devcontainer-configuration.constants";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type { DevcontainerConfiguration } from "./devcontainer-configuration.types";

/**
 * CLI command that syncs common fields from the local devcontainer config into the cloud config.
 * Runs in check (default) or write mode based on the first positional argument.
 */
@Command({
  description: "Run the devcontainer-configuration command",
  name: "devcontainer-configuration",
})
@Injectable()
export class DevcontainerConfigurationCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(DevcontainerConfigurationCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "devcontainer-configuration";

  // 🔏 Private Methods

  /**
   * Merges local devcontainer fields into a copy of the cloud config, preserving cloud-only keys.
   */
  private applySync(
    localConfig: DevcontainerConfiguration,
    cloudConfig: DevcontainerConfiguration,
  ): DevcontainerConfiguration {
    const mergedConfig: DevcontainerConfiguration = { ...cloudConfig };

    this.syncVerbatimFields(localConfig, mergedConfig);
    this.preserveRemoteEnvironment(cloudConfig, mergedConfig);
    this.syncFeatures(localConfig, cloudConfig, mergedConfig);

    for (const key of DEVCONTAINER_CLOUD_ONLY_KEYS) {
      if (key in cloudConfig) mergedConfig[key] = cloudConfig[key];
      else Reflect.deleteProperty(mergedConfig, key);
    }

    return mergedConfig;
  }

  /**
   * Compares the expected merged config against the current cloud config file and reports field differences.
   */
  private check(
    expectedConfig: DevcontainerConfiguration,
    cloudConfigFile: string,
  ): boolean {
    if (this.isCurrent(expectedConfig, cloudConfigFile)) {
      return true;
    }

    const workspaceRoot = process.cwd();
    const relativeFilePath = path.relative(workspaceRoot, cloudConfigFile);
    const currentConfig: DevcontainerConfiguration = JSON5.parse(
      readFileSync(cloudConfigFile, "utf8"),
    );

    this.logger.info("📦 Detected out-of-sync common fields", undefined, {
      hint: "Run: nx run synchronization:devcontainer-configuration:write",
      relativeFilePath,
    });

    this.reportDifferences(structuredClone(expectedConfig), currentConfig);

    return false;
  }

  /**
   * Whether the cloud file already holds the merged configuration.
   *
   * Compared as parsed values rather than as text, so how the formatter laid
   * the JSON out never reads as drift. Write mode asks the same question before
   * rewriting anything, which is what stops a write from producing a diff a
   * check had already passed: `JSON.stringify` puts every array element on its
   * own line, and the formatter then collapses the short ones back.
   */
  private isCurrent(
    expectedConfig: DevcontainerConfiguration,
    cloudConfigFile: string,
  ): boolean {
    const currentConfig: DevcontainerConfiguration = JSON5.parse(
      readFileSync(cloudConfigFile, "utf8"),
    );

    return _.isEqual(structuredClone(expectedConfig), currentConfig);
  }

  /**
   * Returns true if the feature key refers to a Docker-in-Docker or Docker-outside-of-Docker feature.
   */
  private isDockerFeatureKey(key: string): boolean {
    return (
      key.includes("docker-in-docker") ||
      key.includes("docker-outside-of-docker")
    );
  }

  /**
   * Restores environment-specific keys from the cloud config into the merged config.
   */
  private preserveRemoteEnvironment(
    cloudConfig: DevcontainerConfiguration,
    mergedConfig: DevcontainerConfiguration,
  ): void {
    const cloudRemoteEnvironment = cloudConfig.remoteEnv;
    const mergedRemoteEnvironment = mergedConfig.remoteEnv;

    if (!cloudRemoteEnvironment || !mergedRemoteEnvironment) return;

    for (const key of DEVCONTAINER_REMOTE_ENVIRONMENT_PRESERVED_KEYS) {
      const value = cloudRemoteEnvironment[key];
      if (value !== undefined) {
        mergedRemoteEnvironment[key] = value;
      }
    }
  }

  /**
   * Logs each field that differs between the expected and current config.
   */
  private reportDifferences(
    expectedFields: Record<string, unknown>,
    currentFields: Record<string, unknown>,
  ): void {
    const allFieldKeys = new Set([
      ...Object.keys(expectedFields),
      ...Object.keys(currentFields),
    ]);
    for (const key of allFieldKeys) {
      if (DEVCONTAINER_CLOUD_ONLY_KEYS.has(key)) continue;
      if (!_.isEqual(expectedFields[key], currentFields[key])) {
        this.logger.info("🔀 Differing field", undefined, {
          actual: currentFields[key],
          expected: expectedFields[key],
          key,
        });
      }
    }
  }

  /**
   * Merges features from local and cloud configs, keeping Docker features from cloud.
   */
  private syncFeatures(
    localConfig: DevcontainerConfiguration,
    cloudConfig: DevcontainerConfiguration,
    mergedConfig: DevcontainerConfiguration,
  ): void {
    const localFeatures = localConfig.features ?? {};
    const cloudFeatures = cloudConfig.features ?? {};
    const mergedFeatures: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(localFeatures)) {
      if (!this.isDockerFeatureKey(key)) mergedFeatures[key] = value;
    }
    for (const [key, value] of Object.entries(cloudFeatures)) {
      if (this.isDockerFeatureKey(key)) mergedFeatures[key] = value;
    }
    mergedConfig.features = mergedFeatures;
  }

  /**
   * Copies SYNCED_KEYS fields from local config into the merged config.
   */
  private syncVerbatimFields(
    localConfig: DevcontainerConfiguration,
    mergedConfig: DevcontainerConfiguration,
  ): void {
    for (const key of DEVCONTAINER_SYNCED_KEYS) {
      if (key in localConfig) mergedConfig[key] = localConfig[key];
      else Reflect.deleteProperty(mergedConfig, key);
    }
  }

  /**
   * Serializes the merged config to JSON and writes it to the cloud devcontainer file.
   */
  private write(
    mergedConfig: DevcontainerConfiguration,
    cloudConfigFile: string,
  ): void {
    const workspaceRoot = process.cwd();
    const relativeFilePath = path.relative(workspaceRoot, cloudConfigFile);
    writeFileSync(
      cloudConfigFile,
      `${JSON.stringify(mergedConfig, null, 2)}\n`,
      "utf8",
    );
    this.logger.info(
      "📦 Updated the cloud devcontainer config file",
      undefined,
      {
        relativeFilePath,
      },
    );
  }

  /**
   * Rewrites the cloud file, unless it already holds what a write would put there.
   *
   * The same comparison check mode makes, asked before writing rather than
   * instead of writing. A write that rewrote regardless produced a diff on
   * every run that check had already passed, so the two modes disagreed about
   * the same file.
   */
  private writeWhenDrifted(
    mergedConfig: DevcontainerConfiguration,
    cloudConfigFile: string,
  ): boolean {
    if (this.isCurrent(mergedConfig, cloudConfigFile)) {
      this.logger.info(
        "📦 Left the cloud devcontainer config as the local config already implies",
      );
      return true;
    }

    this.write(mergedConfig, cloudConfigFile);
    this.logger.info(
      "📦 Updated the cloud devcontainer config from the local config",
    );

    return true;
  }

  // 🌎 Public Methods

  /**
   * Runs the devcontainer-configuration sync command in check or write mode.
   */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:devcontainer-configuration:check (or synchronization:devcontainer-configuration:write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes the cloud devcontainer config and reports success without exiting. */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    try {
      await Promise.resolve();
      const workspaceRoot = process.cwd();
      const localConfigFile = path.join(
        workspaceRoot,
        ".devcontainer/local/devcontainer.json",
      );
      const cloudConfigFile = path.join(
        workspaceRoot,
        ".devcontainer/cloud/devcontainer.json",
      );

      const localConfig: DevcontainerConfiguration = JSON5.parse(
        readFileSync(localConfigFile, "utf8"),
      );
      const cloudConfig: DevcontainerConfiguration = JSON5.parse(
        readFileSync(cloudConfigFile, "utf8"),
      );
      const mergedConfig = this.applySync(localConfig, cloudConfig);

      if (mode === "check") {
        if (!this.check(mergedConfig, cloudConfigFile)) return false;
        this.logger.info(
          "📦 Verified the cloud devcontainer config against the local config",
        );
        return true;
      }

      return this.writeWhenDrifted(mergedConfig, cloudConfigFile);
    } catch (error) {
      this.logger.error(
        "💥 Failed synchronizing the devcontainer configuration",
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
