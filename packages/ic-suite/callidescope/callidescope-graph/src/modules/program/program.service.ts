import path from "node:path";

import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { LoggerService } from "@codebase/logging";

import { WorkspaceService } from "../workspace/workspace.service";

import { CompilerHostService } from "./compiler-host.service";
import {
  DEPENDENCY_DIRECTORY_NAME,
  ProgramConfigurationError,
} from "./program.constants";

import type { WorkspaceProject } from "../workspace/workspace.types";
import type {
  BuildProgramsArguments,
  ProgramSet,
  ProjectProgram,
} from "./program.types";

/**
 * Turns each project's `tsconfig.json` into a program and a type checker.
 *
 * One program per project rather than one merged program, and that is a
 * correctness decision rather than a performance one. The projects here
 * disagree about `jsx`, `lib`, `types`, and `paths`; merging their options
 * changes which globals exist and how modules resolve, so the checker starts
 * answering with different symbols and the call graph silently gains wrong
 * edges. Paying for twenty-odd programs buys the right answer.
 */
@Injectable()
export class ProgramService {
  // 🏗 Dependency Injection

  constructor(
    private readonly compilerHostService: CompilerHostService,
    private readonly logger: LoggerService,
    private readonly workspaceService: WorkspaceService,
  ) {
    this.logger.setContext(ProgramService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Assigns each file to the program whose project root contains it.
   *
   * Projects overlap: a project that nests a second `tsconfig.json` beneath
   * it can list the same file as its parent, when the parent's own `include`
   * is broad enough to reach it too. Containment settles that overlap by the
   * file's location on disk rather than by which program asked first, which
   * is what keeps a reported depth the same however a run is scoped — a
   * closure that starts programs in a different order reaches the same
   * answer. A file none of `programs`' projects contains is left out of the
   * map rather than guessed at; `readOwnedPath` in `CallablesService` then
   * walks it through no program at all.
   */
  private assignOwnership(args: {
    programs: readonly ProjectProgram[];
    workspaceRoot: string;
  }): Map<string, ProjectProgram> {
    // Resolved through `toRealPath` too, so it lines up with `filePath`
    // below, which every owned path already went through to reach — a
    // workspace reached through a symlink would otherwise turn every
    // relative path into a string of `../` that contains nothing.
    const workspaceRoot = this.toRealPath(args.workspaceRoot);
    const projects = args.programs.map(
      (projectProgram) => projectProgram.project,
    );
    const filePaths = new Set<string>();

    for (const projectProgram of args.programs) {
      for (const filePath of projectProgram.ownedFilePaths) {
        filePaths.add(filePath);
      }
    }

    const ownerByFilePath = new Map<string, ProjectProgram>();

    for (const filePath of filePaths) {
      const workspaceRelativePath = this.workspaceService.toWorkspaceRelative({
        absolutePath: filePath,
        workspaceRoot,
      });
      const owningProject = this.workspaceService.resolveOwningProject({
        projects,
        workspaceRelativePath,
      });
      const projectProgram = args.programs.find(
        (candidate) => candidate.project === owningProject,
      );

      if (projectProgram === undefined) {
        this.logger.warn(
          "🔭 Skipped a file no traced project contains",
          undefined,
          { workspaceRelativePath },
        );
        continue;
      }

      ownerByFilePath.set(filePath, projectProgram);
    }

    return ownerByFilePath;
  }

  /** Builds one project's program, checker, and owned-file set. */
  private buildProgram(args: {
    project: WorkspaceProject;
    workspaceRoot: string;
  }): ProjectProgram {
    const parsed = this.parseConfiguration(args.project);
    const host = this.compilerHostService.createHost({
      options: parsed.options,
      workspaceRoot: args.workspaceRoot,
    });
    const program = ts.createProgram({
      host,
      options: parsed.options,
      rootNames: parsed.fileNames,
    });

    return {
      checker: program.getTypeChecker(),
      ownedFilePaths: new Set(
        parsed.fileNames.map((fileName) => this.toRealPath(fileName)),
      ),
      program,
      project: args.project,
    };
  }

  /**
   * Reads and fully resolves one project's compiler options.
   *
   * The configuration file name is passed as the fifth argument because that is
   * what makes TypeScript follow the `extends` chain to the shared base config
   * and report diagnostics against the right file.
   */
  private parseConfiguration(project: WorkspaceProject): ts.ParsedCommandLine {
    // Wrapped rather than passed as a bare reference: handing over
    // `ts.sys.readFile` detaches it from `ts.sys`, and any implementation that
    // reads `this` would break in a way that only shows up at run time.
    // The source-file form rather than `readConfigFile`, whose `config` is
    // typed `any` — letting that in would quietly strip the types off everything the parsed
    // configuration touches downstream.
    const sourceFile = ts.readJsonConfigFile(
      project.configurationPath,
      (fileName) => ts.sys.readFile(fileName),
    );
    const parsed = ts.parseJsonSourceFileConfigFileContent(
      sourceFile,
      ts.sys,
      path.dirname(project.configurationPath),
      undefined,
      project.configurationPath,
    );

    if (parsed.errors.length > 0) {
      throw new ProgramConfigurationError({
        configurationPath: project.configurationPath,
        messages: parsed.errors.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
        ),
      });
    }

    return parsed;
  }

  /**
   * Reports the workspace-relative paths one program pulled in.
   *
   * `getSourceFiles()` rather than the parsed configuration's `fileNames`,
   * and the difference is the whole point: `fileNames` is what a project's own
   * `tsconfig.json` listed, which by definition never mentions the packages it
   * imports. `getSourceFiles()` is what the compiler actually had to read to
   * type the project, so a workspace package reached through an import is in
   * there — and in a pnpm workspace it is reached through a symlink, which is
   * why every path goes through `toRealPath` before it is made relative.
   *
   * A path under `node_modules` is dropped rather than reported. It is a real
   * dependency rather than workspace code, and the workspace root is itself a
   * project whose root contains every such path — so reporting one would walk
   * `lib.es5.d.ts` back to the root project and pull the entire workspace into
   * every closure.
   */
  private readPulledInPaths(args: {
    program: ts.Program;
    workspaceRoot: string;
  }): string[] {
    const workspaceRoot = this.toRealPath(args.workspaceRoot);
    const pulledIn: string[] = [];

    for (const sourceFile of args.program.getSourceFiles()) {
      const workspaceRelativePath = this.workspaceService.toWorkspaceRelative({
        absolutePath: this.toRealPath(sourceFile.fileName),
        workspaceRoot,
      });
      const segments = workspaceRelativePath.split("/");

      if (
        segments[0] !== ".." &&
        !segments.includes(DEPENDENCY_DIRECTORY_NAME)
      ) {
        pulledIn.push(workspaceRelativePath);
      }
    }

    return pulledIn;
  }

  // 🌎 Public Methods

  /**
   * Builds a program for every project in the starting projects' dependency
   * closure, and decides which one owns each file.
   *
   * The apparent circularity — the closure names the projects to build, but
   * naming them means asking what each one pulled in, which means building it
   * — is only apparent. Finding project *roots* is a filesystem walk that
   * builds nothing; finding what a project *reaches* is what needs a program.
   * So the closure walk is driven from here, and the callback it asks for a
   * project's files is what builds that project's program. The traversal asks
   * exactly once per project it reaches, and the programs built along the way
   * are kept rather than discarded — they are precisely the set the run goes
   * on to trace with, so rebuilding them afterwards would build the whole
   * closure twice.
   *
   * A project nothing reaches is never asked about and so never built, which
   * is what keeps a run scoped to one package from compiling the workspace.
   * Neither is a project reached only as a directory of shared settings, nor
   * the workspace root itself — `WorkspaceService.isClosureDestination`
   * refuses those and holds the reasoning. An unscoped run passes every
   * project as a
   * starting project, so its closure is every project, both rules are moot,
   * and nothing about it changes.
   *
   * A project whose configuration cannot be parsed ends the run rather than
   * being stepped over — see `ProgramConfigurationError` for why a partial
   * graph is the worse outcome. A project that should not be read at all is
   * kept out by an exclusion, which `WorkspaceService.discoverProjects`
   * applies to both lists before this ever sees them, so an unreadable
   * fixture an ignore file names is not in `workspaceProjects` and no closure
   * can reach it.
   */
  public buildPrograms(args: BuildProgramsArguments): ProgramSet {
    const built: ProjectProgram[] = [];

    // The traversal returns nothing, by design: the projects it reached are
    // exactly the ones it asked for files, so `built` is the only
    // representation of the closure there is and the count logged below
    // cannot describe anything other than what was really built.
    this.workspaceService.walkImportedProjectClosure({
      resolveProjectFiles: (project): readonly string[] => {
        this.logger.debug("🔭 Reading a project", undefined, {
          projectName: project.name,
        });

        const projectProgram = this.buildProgram({
          project,
          workspaceRoot: args.workspaceRoot,
        });

        built.push(projectProgram);

        return this.readPulledInPaths({
          program: projectProgram.program,
          workspaceRoot: args.workspaceRoot,
        });
      },
      startingProjects: args.startingProjects,
      workspaceProjects: args.workspaceProjects,
    });

    this.logger.debug("🔭 Resolved a dependency closure", undefined, {
      projectCount: built.length,
      startingProjectCount: args.startingProjects.length,
    });

    // Ordered by project name rather than by the order the closure happened to
    // reach them, so a report's per-project rows read the same whichever
    // starting root a run was pointed at.
    const programs = built.toSorted((first, second) =>
      first.project.name.localeCompare(second.project.name),
    );

    return {
      ownerByFilePath: this.assignOwnership({
        programs,
        workspaceRoot: args.workspaceRoot,
      }),
      programs,
    };
  }

  /** Resolves a path through symlinks, which is how pnpm workspaces link. */
  public toRealPath(filePath: string): string {
    return ts.sys.realpath === undefined ? filePath : ts.sys.realpath(filePath);
  }
}
