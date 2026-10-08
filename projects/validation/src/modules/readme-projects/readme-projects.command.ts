import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logging";

import { ReadmeProjectsService } from "./readme-projects.service";

/**
 * CLI command that checks the root README links to every workspace project.
 *
 * A project is any directory with its own `package.json` under `projects/`,
 * at any depth below its grouping folders. A project it does not list stays
 * invisible to anyone reading the README instead of the workspace, so this
 * fails the moment a new project ships without a matching entry.
 *
 * Exits 0 when every project is linked and 1 when any of them is not.
 */
@Command({
  description: "Check that the root README links to every workspace project",
  name: "readme-projects",
})
@Injectable()
export class ReadmeProjectsCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly readmeProjectsService: ReadmeProjectsService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ReadmeProjectsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks every workspace project and exits 0 or 1 on the verdict. */
  public async run(): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const workspaceRoot = process.cwd();
    const projectPaths =
      this.readmeProjectsService.resolveWorkspaceProjectPaths(workspaceRoot);
    const readmeContents =
      this.readmeProjectsService.readRootReadme(workspaceRoot);
    const undocumentedProjectPaths =
      this.readmeProjectsService.findUndocumentedProjectPaths(
        projectPaths,
        readmeContents,
      );

    if (undocumentedProjectPaths.length === 0) {
      console.info(
        `Root README documents all ${String(projectPaths.length)} workspace projects.`,
      );

      return;
    }

    console.error("Root README is missing these workspace projects:");

    for (const undocumentedProjectPath of undocumentedProjectPaths) {
      console.error(`- ${undocumentedProjectPath}`);
    }

    process.exit(1);
  }
}
