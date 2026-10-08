import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { PackageManifestsService } from "./package-manifests.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";

/**
 * CLI command that synchronizes package manifest metadata (license, repository,
 * homepage, and issue tracker) across all 29 publishable packages.
 */
@Command({
  description: "Run the package-manifests command",
  name: "package-manifests",
})
@Injectable()
export class PackageManifestsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly packageManifestsService: PackageManifestsService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(PackageManifestsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "package-manifests";

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Runs the package-manifests sync command and exits 1 on drift in check mode. */
  async run(passedParameters: string[]): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:package-manifests:check (or synchronization:package-manifests:write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes package manifest metadata and reports success without exiting. */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    try {
      await Promise.resolve();
      const workspaceRoot = process.cwd();

      if (mode === "write") {
        this.packageManifestsService.writeAll(workspaceRoot);
        this.logger.info(
          "📦 Synchronized manifest metadata across publishable packages",
          undefined,
          {
            mode: "write",
          },
        );
        return true;
      }

      const summary = this.packageManifestsService.checkAll(workspaceRoot);

      if (summary.isSynchronized) {
        this.logger.info(
          "📦 Verified manifest metadata across publishable packages",
          undefined,
          {
            checkedCount: summary.checkedCount,
          },
        );
        return true;
      }

      this.logger.info(
        "📦 Detected out-of-sync package manifest metadata",
        undefined,
        {
          checkedCount: summary.checkedCount,
          failedCount: summary.failedProjects.length,
          failedProjects: summary.failedProjects.map((p) => ({
            differences: p.differences,
            packageName: p.packageName,
            projectPath: p.projectPath,
          })),
          hint: "Run 'nx run synchronization:package-manifests:write' to sync",
        },
      );

      return false;
    } catch (error) {
      const message = error instanceof Error ? error.stack : String(error);
      this.logger.error(
        "💥 Failed synchronizing package manifest metadata",
        message,
      );
      return false;
    }
  }
}
