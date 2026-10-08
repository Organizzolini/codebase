import { existsSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import ts from "typescript";

import {
  TYPESCRIPT_PROJECT_CONFIG_FILE,
  TypescriptProjectConfigurationError,
} from "./typescript.constants";

import type {
  TypescriptProject,
  TypescriptProjectProgram,
} from "./typescript.types";

/**
 * Discovers the workspace's TypeScript projects and builds a `ts.Program`
 * for each one.
 *
 * Every project carrying its own `tsconfig.json` is a candidate — unlike
 * `codependix-nestjs-modules`'s `NestjsProjectService`, discovery reads no Nx tag,
 * since a file-level import graph is meaningful for any TypeScript project.
 * `ts.createProgram` is built the same way `callidescope-cli`'s
 * `ProgramService` builds one: reading and fully resolving the project's own
 * `tsconfig.json` through `ts.parseJsonSourceFileConfigFileContent`, so the
 * program's module resolution — and therefore
 * `TypescriptImportGraphService`'s — agrees with what `tsc` itself would resolve for
 * this workspace's path aliases and NodeNext `.js`-extension imports.
 */
@Injectable()
export class TypescriptProjectService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads and fully resolves one project's compiler options.
   *
   * The configuration file name is passed as the fifth argument so that
   * TypeScript follows the `extends` chain to the shared base config and
   * reports diagnostics against the right file, mirroring
   * `callidescope-cli`'s `ProgramService.parseConfiguration`.
   */
  private parseConfiguration(project: TypescriptProject): ts.ParsedCommandLine {
    const sourceFile = ts.readJsonConfigFile(project.tsconfigPath, (fileName) =>
      ts.sys.readFile(fileName),
    );
    const parsed = ts.parseJsonSourceFileConfigFileContent(
      sourceFile,
      ts.sys,
      path.dirname(project.tsconfigPath),
      undefined,
      project.tsconfigPath,
    );

    if (parsed.errors.length > 0) {
      throw new TypescriptProjectConfigurationError({
        configurationPath: project.tsconfigPath,
        messages: parsed.errors.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
        ),
      });
    }

    return parsed;
  }

  // 🌎 Public Methods

  /** Builds one project's program, keeping the host and options alongside it. */
  buildProgram(project: TypescriptProject): TypescriptProjectProgram {
    const parsed = this.parseConfiguration(project);
    const host = ts.createCompilerHost(parsed.options, true);
    const program = ts.createProgram({
      host,
      options: parsed.options,
      rootNames: parsed.fileNames,
    });

    return { host, options: parsed.options, program, project };
  }

  /** Describes a project by its directory and Nx project name. */
  describeProject(absoluteRoot: string, name: string): TypescriptProject {
    return {
      absoluteRoot,
      name,
      tsconfigPath: path.join(absoluteRoot, TYPESCRIPT_PROJECT_CONFIG_FILE),
    };
  }

  /**
   * Filters an already-read list of Nx projects down to the ones carrying
   * their own `tsconfig.json`, and describes each one.
   *
   * Projects are returned in the order they were given, which callers keep
   * sorted by name — the same order `codependix-nx-projects`'s `NeighborhoodService`
   * reads the Nx project graph's own projects in.
   */
  discoverProjects(
    projects: { absoluteRoot: string; name: string }[],
  ): TypescriptProject[] {
    return projects
      .filter((project) =>
        existsSync(
          path.join(project.absoluteRoot, TYPESCRIPT_PROJECT_CONFIG_FILE),
        ),
      )
      .map((project) =>
        this.describeProject(project.absoluteRoot, project.name),
      );
  }

  /** Resolves a path through symlinks, which is how pnpm workspaces link. */
  toRealPath(filePath: string): string {
    return ts.sys.realpath === undefined ? filePath : ts.sys.realpath(filePath);
  }
}
