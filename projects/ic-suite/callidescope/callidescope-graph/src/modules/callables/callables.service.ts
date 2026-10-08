import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { ProgramService } from "../program/program.service";
import { WorkspaceService } from "../workspace/workspace.service";

import { CallableIdentityService } from "./callable-identity.service";

import type { ProjectProgram } from "../program/program.types";
import type {
  CallableCollection,
  CallableDeclaration,
  CollectCallablesArguments,
  DescribeCallableArguments,
  DiscoveredCallable,
} from "./callables.types";
import type { CallableId } from "@callidescope/core";

/**
 * Walks every owned file and collects the callables a call stack can hold.
 *
 * Overload signatures are skipped in favour of the one declaration with a body:
 * a signature is a promise about a call, not a frame the runtime ever pushes.
 */
@Injectable()
export class CallablesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly callableIdentityService: CallableIdentityService,
    private readonly programService: ProgramService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Collects every callable declaration in one source file. */
  private collectFromFile(args: {
    projectProgram: ProjectProgram;
    sourceFile: ts.SourceFile;
    workspaceRelativePath: string;
  }): DiscoveredCallable[] {
    const collected: DiscoveredCallable[] = [];

    const visit = (node: ts.Node): void => {
      if (this.isCallableDeclaration(node) && node.body !== undefined) {
        collected.push(
          this.describe({
            declaration: node,
            projectProgram: args.projectProgram,
            workspaceRelativePath: args.workspaceRelativePath,
          }),
        );
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(args.sourceFile, visit);

    return collected;
  }

  /**
   * Walks the files one program owns, skipping the ones it does not.
   *
   * Iterating the program's own source files rather than looking each owned
   * path up in it. A workspace reached through a symlink — a macOS temp
   * directory, a pnpm store — hands the program one spelling of a path and the
   * ownership map another, and a lookup would then quietly find nothing rather
   * than fail.
   */
  private collectFromProgram(
    args: CollectCallablesArguments & { projectProgram: ProjectProgram },
  ): { callables: DiscoveredCallable[] }[] {
    const walked: { callables: DiscoveredCallable[] }[] = [];
    // The owning project's answer, not the run's: this walk only ever reaches
    // files this program owns, so the project asked is the project the file
    // belongs to.
    const includeTests =
      args.includeTestsByProject.get(args.projectProgram.project.name) ??
      args.includeTests;

    for (const sourceFile of args.projectProgram.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) {
        continue;
      }

      const workspaceRelativePath = this.readOwnedPath({
        ownerByFilePath: args.ownerByFilePath,
        projectProgram: args.projectProgram,
        sourceFile,
        workspaceRoot: args.workspaceRoot,
      });

      if (
        workspaceRelativePath === undefined ||
        args.fileFilter.isExcluded(workspaceRelativePath) ||
        (!includeTests &&
          this.workspaceService.isTestFile(workspaceRelativePath))
      ) {
        continue;
      }

      walked.push({
        callables: this.collectFromFile({
          projectProgram: args.projectProgram,
          sourceFile,
          workspaceRelativePath,
        }),
      });
    }

    return walked;
  }

  /** Turns one declaration into a fully described node. */
  private describe(args: DescribeCallableArguments): DiscoveredCallable {
    const { declaration, projectProgram, workspaceRelativePath } = args;

    return {
      declaration,
      node: {
        displayName: this.callableIdentityService.readDisplayName(declaration),
        enclosingTypeName:
          this.callableIdentityService.readEnclosingTypeName(declaration),
        id: this.callableIdentityService.buildId({
          declaration,
          workspaceRelativePath,
        }),
        isExported: this.callableIdentityService.isExported(declaration),
        kind: this.callableIdentityService.readKind(declaration),
        location: this.callableIdentityService.readLocation({
          declaration,
          workspaceRelativePath,
        }),
        memberName: this.callableIdentityService.readMemberName(declaration),
        projectName: projectProgram.project.name,
        statementCount:
          this.callableIdentityService.countStatements(declaration),
      },
      projectProgram,
    };
  }

  /** True when a node is a declaration this tool treats as a frame. */
  private isCallableDeclaration(node: ts.Node): node is CallableDeclaration {
    return (
      ts.isArrowFunction(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    );
  }

  /** Returns the workspace-relative path, or nothing when unowned. */
  private readOwnedPath(args: {
    ownerByFilePath: ReadonlyMap<string, ProjectProgram>;
    projectProgram: ProjectProgram;
    sourceFile: ts.SourceFile;
    workspaceRoot: string;
  }): string | undefined {
    const realPath = this.programService.toRealPath(args.sourceFile.fileName);

    if (args.ownerByFilePath.get(realPath) !== args.projectProgram) {
      return undefined;
    }

    return this.workspaceService.toWorkspaceRelative({
      absolutePath: realPath,
      workspaceRoot: args.workspaceRoot,
    });
  }

  // 🌎 Public Methods

  /**
   * Walks every owned file and returns the callables found, keyed by id.
   *
   * Each file is walked by the one program that owns it, so a package shared by
   * several projects contributes its callables once rather than once per
   * dependent.
   */
  public collect(args: CollectCallablesArguments): CallableCollection {
    const byId = new Map<CallableId, DiscoveredCallable>();
    const fileCountByProject = new Map<string, number>();
    let fileCount = 0;

    for (const projectProgram of new Set(args.ownerByFilePath.values())) {
      const { name } = projectProgram.project;

      for (const discovered of this.collectFromProgram({
        ...args,
        projectProgram,
      })) {
        for (const callable of discovered.callables) {
          byId.set(callable.node.id, callable);
        }

        fileCount += 1;
        fileCountByProject.set(name, (fileCountByProject.get(name) ?? 0) + 1);
      }
    }

    return { byId, fileCount, fileCountByProject };
  }
}
