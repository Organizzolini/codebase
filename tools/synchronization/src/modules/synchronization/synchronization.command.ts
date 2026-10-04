import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { ConformetryGeneratorsCommand } from "../conformetry-generators/conformetry-generators.command";
import { ConventionalConfigCommand } from "../conventional-config/conventional-config.command";
import { DevcontainerConfigurationCommand } from "../devcontainer-configuration/devcontainer-configuration.command";
import { PackageManifestsCommand } from "../package-manifests/package-manifests.command";
import { PullRequestLabelsCommand } from "../pull-request-labels/pull-request-labels.command";
import { PullRequestTemplateCommand } from "../pull-request-template/pull-request-template.command";
import { SkillExclusionsCommand } from "../skill-exclusions/skill-exclusions.command";

import { SynchronizationService } from "./synchronization.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
  SynchronizationResult,
} from "./synchronization.types";

/**
 * CLI command that runs every synchronization command in one process.
 *
 * Every command also runs on its own through its own Nx target — this exists
 * only for a human at a terminal who wants to check or write everything in
 * one command, and it is never named by any workflow or `lint-staged`
 * pattern. It has no `--kinds` or other selection flag: unlike the callers
 * that name specific targets, running "all of them, always" needs no
 * per-command declaration to select against.
 *
 * `nestjs-module-graphs` and `nx-project-graphs` are absent from this
 * aggregate because they no longer exist at all: `packages/ic-suite/codependix/codependix-nx-projects`
 * and `packages/ic-suite/codependix/codependix-nestjs-modules` now produce the same graphs through their own
 * anchor blocks, per issue #296, so both commands and their Nx targets were
 * removed outright rather than merely dropped from this list. Run
 * `nx run codebase:codependix` for what replaced them — there is nothing left
 * here to invoke directly.
 */
@Command({
  description: "Run every synchronization command",
  name: "synchronization",
})
@Injectable()
export class SynchronizationCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly conformetryGeneratorsCommand: ConformetryGeneratorsCommand,
    private readonly conventionalConfigCommand: ConventionalConfigCommand,
    private readonly devcontainerConfigurationCommand: DevcontainerConfigurationCommand,
    private readonly logger: LoggerService,
    private readonly packageManifestsCommand: PackageManifestsCommand,
    private readonly pullRequestLabelsCommand: PullRequestLabelsCommand,
    private readonly pullRequestTemplateCommand: PullRequestTemplateCommand,
    private readonly skillExclusionsCommand: SkillExclusionsCommand,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(SynchronizationCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Every command this aggregate drives, in a stable reporting order.
   *
   * A command registered in the module but left out here would never run as
   * part of `all`, and nothing else would notice — its own Nx target would
   * still catch drift on its own.
   */
  private getCommands(): SynchronizableCommand[] {
    return [
      this.conformetryGeneratorsCommand,
      this.conventionalConfigCommand,
      this.devcontainerConfigurationCommand,
      this.packageManifestsCommand,
      this.pullRequestLabelsCommand,
      this.pullRequestTemplateCommand,
      this.skillExclusionsCommand,
    ];
  }

  /** Logs a one-line-per-command summary of the run. */
  private reportResults(
    mode: SynchronizationMode,
    results: SynchronizationResult[],
  ): void {
    const failed = results.filter((result) => !result.succeeded);

    this.logger.info("📋 Summarized the synchronization run", undefined, {
      failed: results.filter((result) => !result.succeeded).map((r) => r.label),
      mode,
      succeeded: results
        .filter((result) => result.succeeded)
        .map((r) => r.label),
    });

    if (failed.length === 0) {
      this.logger.info("🔗 Verified every synchronization", undefined, {
        count: results.length,
      });
      return;
    }

    this.logger.info("🔗 Detected out-of-sync synchronizations", undefined, {
      count: failed.length,
      hint: "Run the failing command's own `:write` Nx target to fix it",
      total: results.length,
    });
  }

  // 🌎 Public Methods

  /** Runs every synchronization, exiting once if any reported drift. */
  async run(passedParameters: string[]): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:start (or synchronization:start:write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /**
   * Runs every synchronization and reports whether all succeeded.
   *
   * Commands run in sequence and every one runs even after an earlier
   * failure, so a single run surfaces all drift instead of only the first
   * instance. They are not parallelized: several write to AGENTS.md.
   */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    const commands = this.getCommands();
    const results: SynchronizationResult[] = [];

    for (const command of commands) {
      this.logger.info("🔄 Synchronizing a command", undefined, {
        label: command.synchronizationLabel,
      });
      results.push({
        label: command.synchronizationLabel,
        succeeded: await command.synchronize(mode),
      });
    }

    this.reportResults(mode, results);

    return results.every((result) => result.succeeded);
  }
}
