import path from "node:path";

import { ConfigurationService } from "@callidescope/configuration";
import { FileFilterService, WorkspaceService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type {
  LimitName,
  LimitsCommandOptions,
  ProjectLimitRow,
} from "./limits.types";
import type {
  ProjectLimits,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/**
 * Says what every project in a workspace is gated by, without tracing it.
 *
 * Reads configuration and never measures anything: no program is built, no
 * call graph is assembled, and no limit is evaluated. That separation is the
 * point, and it is the one `codometer configuration --limits` already makes —
 * a repository whose limits live one per project has no single place left to
 * read them as a set, and this is that place, in milliseconds rather than in
 * however long a trace takes.
 *
 * The numbers come from `ConfigurationService.resolveLimits`, the same
 * resolver a gated run reads. A listing that read the files for itself could
 * disagree with the gate about the same limit, and a limit two answers can be
 * given for is worse than no limit.
 */
@Injectable()
export class LimitsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly fileFilterService: FileFilterService,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(LimitsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Finds the projects the workspace holds, the same walk a trace starts from.
   *
   * The walk rather than a traced run's dependency closure: over a whole
   * workspace the two are the same set, since every discovered project is a
   * starting project and every starting project gets a program. Building those
   * programs to arrive at the same answer would cost the listing the very thing
   * that makes it worth having.
   *
   * The run's own filter and no project's. A project's `exclude` says which of
   * its files are traced, and nothing here traces a file — a project that
   * excluded every file it has still declares the limits it declares, and
   * leaving it off this listing would hide the one place they are written
   * down.
   */
  private discoverProjects(args: {
    configuration: ResolvedCallidescopeConfiguration;
    workspaceRoot: string;
  }): string[] {
    const fileFilter = this.fileFilterService.buildFileFilter({
      exclude: args.configuration.exclude,
      excludeFrom: args.configuration.excludeFrom,
      workspaceRoot: args.workspaceRoot,
    });

    return this.workspaceService
      .discoverProjects({
        directories: args.configuration.directories,
        fileFilter,
        workspaceRoot: args.workspaceRoot,
      })
      .map((project) => project.name);
  }

  /** Builds the two rows one project resolves to, depth first. */
  private toProjectRows(args: {
    limits: ProjectLimits;
    project: string;
    workspaceRoot: string;
  }): ProjectLimitRow[] {
    return [
      this.toRow({ ...args, limit: "maximumDepth" }),
      this.toRow({ ...args, limit: "maximumBreadth" }),
    ];
  }

  /**
   * Reads one resolved limit into the row that prints it.
   *
   * The file is named whenever the row carries a number, because a project's
   * numbers are written in that project's own file or the run refused to
   * start. The one row that can carry a number and no file is the workspace's,
   * whose depth is defaulted during resolution — naming a file there would
   * send a reader to change a line nobody wrote.
   */
  private toRow(args: {
    limit: LimitName;
    limits: ProjectLimits;
    project: string | undefined;
    workspaceRoot: string;
  }): ProjectLimitRow {
    const value = args.limits[args.limit];

    return {
      limit: args.limit,
      path:
        args.limits.path === undefined || value === undefined
          ? undefined
          : path.relative(args.workspaceRoot, args.limits.path),
      project: args.project,
      value,
    };
  }

  /** Builds the two rows for the defaults every project's file spreads. */
  private toWorkspaceRows(args: {
    limits: ProjectLimits;
    workspaceRoot: string;
  }): ProjectLimitRow[] {
    return [
      this.toRow({ ...args, limit: "maximumDepth", project: undefined }),
      this.toRow({ ...args, limit: "maximumBreadth", project: undefined }),
    ];
  }

  // 🌎 Public Methods

  /**
   * Resolves every project's limits, workspace default first.
   *
   * Nothing is written and nothing is gated: a breached limit is not something
   * this can even notice, since no stack has been measured for it to breach.
   * A project whose own configuration file is refused still ends the run, the
   * way it ends a trace — a listing that quietly skipped the one project whose
   * configuration is wrong would be at its least trustworthy exactly when it is
   * most wanted.
   */
  public async list(options: LimitsCommandOptions): Promise<ProjectLimitRow[]> {
    const workspaceRoot = process.cwd();
    // The file-aware load rather than the plain one, and `authored` alongside
    // the resolved object: the listing names the file each number was written
    // in, so it has to know which file it already read as the workspace's own —
    // so that file is never also read as a project's — and which numbers that
    // file actually wrote, which only the authored object can still say.
    const {
      authored,
      configuration,
      path: configurationPath,
    } = await this.configurationService.loadConfigurationFile({
      configurationPath: options.config,
      searchDirectory: workspaceRoot,
    });
    const projects = this.discoverProjects({ configuration, workspaceRoot });
    const projectConfigurations =
      await this.configurationService.loadProjectConfigurations({
        projects,
        workspaceConfigurationPath: configurationPath,
        workspaceRoot,
      });
    const limits = this.configurationService.resolveLimits({
      projectConfigurations,
      projects,
      workspaceAuthoredLimits: authored.limits,
      workspaceConfiguration: configuration,
      workspaceConfigurationPath: configurationPath,
    });

    this.logger.info("🔭 Listed every project's limits", undefined, {
      declaringProjectCount: projectConfigurations.length,
      projectCount: projects.length,
    });

    return [
      ...this.toWorkspaceRows({ limits: limits.workspace, workspaceRoot }),
      ...[...limits.byProject].flatMap(([project, projectLimits]) =>
        this.toProjectRows({ limits: projectLimits, project, workspaceRoot }),
      ),
    ];
  }
}
