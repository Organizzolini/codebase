import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { WorkspaceService } from "./workspace.service";

import type {
  BuildExclusionsArguments,
  BuildProjectFileFilterArguments,
  FileFilter,
  WorkspaceProject,
} from "./workspace.types";

/**
 * Decides which files a run leaves out of the graph.
 *
 * Its own service rather than more of `WorkspaceService`, because a run builds
 * two filters at two different moments and only one of them can exist before
 * the projects are known. The run's own exclusions are settled from the file
 * the run was pointed at, so they are what project discovery is judged by; a
 * project's own exclusions are written in a file sitting at a project root, so
 * nothing can read them until that root has been discovered. Layering the two
 * is this service's whole subject.
 */
@Injectable()
export class FileFilterService {
  // 🏗 Dependency Injection

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(FileFilterService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * True when the project owning a file excludes it with a glob of its own.
   *
   * The project that *owns* the file rather than any project containing it, so
   * a project nested under another answers for its own files: a parent's globs
   * stop at the nested root exactly the way every other per-project answer
   * does. `WorkspaceService.resolveOwningProject` is asked rather than a second
   * containment rule written here, because a file with two answers about which
   * project it belongs to is worse than a file with none.
   *
   * The glob is matched against the path *relative to the owning project's
   * root*, which is what keeps a project's globs inside that project. See
   * `buildProjectFileFilter` for why that anchoring rather than the run's.
   */
  private isExcludedByOwningProject(args: {
    excludeByProject: ReadonlyMap<string, readonly string[]>;
    projects: readonly WorkspaceProject[];
    workspaceRelativePath: string;
  }): boolean {
    const owner = this.workspaceService.resolveOwningProject({
      projects: args.projects,
      workspaceRelativePath: args.workspaceRelativePath,
    });

    if (owner === undefined) {
      return false;
    }

    const globs = args.excludeByProject.get(owner.name);

    if (globs === undefined) {
      return false;
    }

    const projectRelativePath = path.posix.relative(
      owner.root,
      args.workspaceRelativePath,
    );

    return globs.some((glob) => path.matchesGlob(projectRelativePath, glob));
  }

  /**
   * Asks git which tracked files an ignore file excludes.
   *
   * Delegating to git rather than reimplementing gitignore matching is what
   * makes `.callidescopeignore` behave the way its syntax promises. The
   * argument vector form of `execFileSync` keeps a configured path out of a
   * shell.
   */
  private listIgnoredFiles(args: {
    ignorePath: string;
    workspaceRoot: string;
  }): string[] {
    try {
      const output = execFileSync(
        "git",
        [
          "ls-files",
          "--cached",
          "--ignored",
          `--exclude-from=${args.ignorePath}`,
        ],
        { cwd: args.workspaceRoot, encoding: "utf8" },
      );

      return output.trim().split("\n").filter(Boolean);
    } catch {
      this.logger.warn("🔭 Skipped an unreadable ignore file", undefined, {
        ignorePath: args.ignorePath,
      });

      return [];
    }
  }

  // 🌎 Public Methods

  /**
   * Builds the predicate deciding which files stay out of the graph.
   *
   * Exclusion globs are matched with Node's own `path.matchesGlob` rather than
   * a dependency, and gitignore-syntax files are resolved through git itself.
   *
   * This is the *run's* filter and nothing else: its globs come from the file
   * the run was pointed at, and they are written workspace-relative because
   * that file describes a whole workspace. It is what project discovery is
   * judged by, which is the reason the per-project layer is a second call
   * rather than another argument here — a project's globs cannot be read until
   * the project has been discovered, and discovery is what this filter decides.
   */
  public buildFileFilter(args: BuildExclusionsArguments): FileFilter {
    const ignored = new Set<string>();

    for (const ignoreFile of args.excludeFrom) {
      const ignorePath = path.resolve(args.workspaceRoot, ignoreFile);

      if (!existsSync(ignorePath)) {
        this.logger.warn("🔭 Skipped a missing ignore file", undefined, {
          ignoreFile,
        });
        continue;
      }

      for (const filePath of this.listIgnoredFiles({
        ignorePath,
        workspaceRoot: args.workspaceRoot,
      })) {
        ignored.add(filePath);
      }
    }

    const globs = [...args.exclude];

    return {
      isExcluded: (workspaceRelativePath: string): boolean =>
        ignored.has(workspaceRelativePath) ||
        globs.some((glob) => path.matchesGlob(workspaceRelativePath, glob)),
    };
  }

  /**
   * Layers every project's own exclusion globs over the run's filter.
   *
   * **A project's globs are anchored to that project's root**, never to the
   * workspace: `exclude: ["*.generated.ts"]` in `packages/thing`'s own
   * configuration names `packages/thing/*.generated.ts` and can name nothing
   * else. Three reasons, in the order they matter:
   *
   * - It is what makes "a project excludes its own files" true by
   *   construction rather than by a rule somebody has to enforce. A
   *   project-relative glob is only ever matched against paths under that
   *   project's root, so there is no spelling of one that reaches a sibling.
   * - A file at a project root describes that project, and every other file
   *   that sits there is already read that way — a `tsconfig.json`'s own
   *   `include` and `exclude` are project-relative, and so is the path in a
   *   `package.json`. A field that looked identical to the workspace file's
   *   and quietly meant something narrower is the trap this avoids.
   * - The run's own `exclude` keeps its workspace-relative meaning untouched.
   *   One field name read two ways in one file would be indefensible; one
   *   read differently in two files, each way matching what its file is
   *   about, is the distinction the two files already are.
   *
   * The run's filter is layered *under*, never replaced: a project cannot
   * un-exclude what the run excluded, which keeps `exclude` and `excludeFrom`
   * in the workspace file exactly as authoritative as they were.
   *
   * A run in which no project declared anything gets its own filter handed
   * straight back, so the ownership lookup this otherwise does per file costs
   * nothing at all in the workspaces — every one of them today — where no
   * project excludes anything.
   */
  public buildProjectFileFilter(
    args: BuildProjectFileFilterArguments,
  ): FileFilter {
    if (args.excludeByProject.size === 0) {
      return args.fileFilter;
    }

    return {
      isExcluded: (workspaceRelativePath: string): boolean =>
        args.fileFilter.isExcluded(workspaceRelativePath) ||
        this.isExcludedByOwningProject({
          excludeByProject: args.excludeByProject,
          projects: args.projects,
          workspaceRelativePath,
        }),
    };
  }
}
