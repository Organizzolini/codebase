import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  DEPENDENCIES_DIRECTORY_NAME,
  NX_IGNORE_FILENAME,
  PROJECT_CONFIGURATION_FILENAME,
} from "./projects.constants";

import type { ProjectScope } from "../instances/instances.types";
import type {
  ListProjectConfigurationFilesArguments,
  ReadProjectScopeArguments,
} from "./projects.types";

/**
 * Reads the workspace's projects straight from their `project.json` files.
 *
 * Not from the project graph, because two of the callers have none: inferring
 * targets is part of *building* that graph, and the install-time bootstrap
 * runs with no Nx at all. One implementation shared by every caller is what
 * keeps the emitted plugin byte-identical however it was produced — the drift
 * check compares those bytes, and would fire on any disagreement.
 */
@Injectable()
export class ProjectsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows an untrusted value to an array without widening it to `any`. */
  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /**
   * Walks a directory for `project.json` files.
   *
   * Hidden directories and dependencies are skipped: the emitted plugin lives
   * in one of the former, and walking the latter would take longer than every
   * other part of an emit put together.
   */
  private listProjectConfigurationFiles(
    args: ListProjectConfigurationFilesArguments,
  ): string[] {
    const filePaths: string[] = [];

    for (const entry of readdirSync(args.directoryPath, {
      withFileTypes: true,
    })) {
      const entryPath = path.join(args.directoryPath, entry.name);
      const relativePath = path
        .relative(args.workspaceRoot, entryPath)
        .split(path.sep)
        .join("/");

      if (entry.isFile() && entry.name === PROJECT_CONFIGURATION_FILENAME) {
        filePaths.push(relativePath);
        continue;
      }

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== DEPENDENCIES_DIRECTORY_NAME &&
        !args.ignoredPaths.includes(relativePath)
      ) {
        filePaths.push(
          ...this.listProjectConfigurationFiles({
            directoryPath: entryPath,
            ignoredPaths: args.ignoredPaths,
            workspaceRoot: args.workspaceRoot,
          }),
        );
      }
    }

    return filePaths;
  }

  /**
   * Reads the paths `.nxignore` excludes from project discovery.
   *
   * Honored because a `project.json` inside a generator template is not a
   * project — it is a file the template will one day render — and `.nxignore`
   * is where a workspace already says so. Reading it keeps this walk agreeing
   * with the graph Nx itself builds.
   */
  private readIgnoredPaths(workspaceRoot: string): string[] {
    const ignoreFilePath = path.resolve(workspaceRoot, NX_IGNORE_FILENAME);

    if (!existsSync(ignoreFilePath)) {
      return [];
    }

    return readFileSync(ignoreFilePath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
  }

  // 🌎 Public Methods

  /**
   * Every project in the workspace, as a scope a generator can be matched to.
   *
   * Sorted by name so that anything derived from this list — the choices an
   * emitted schema offers, above all — is stable between runs.
   */
  public listWorkspaceProjects(workspaceRoot: string): ProjectScope[] {
    return this.listProjectConfigurationFiles({
      directoryPath: workspaceRoot,
      ignoredPaths: this.readIgnoredPaths(workspaceRoot),
      workspaceRoot,
    })
      .map((projectConfigurationFile) => {
        return this.readProjectScope({
          projectConfigurationFile,
          workspaceRoot,
        });
      })
      .toSorted((left, right) => left.name.localeCompare(right.name));
  }

  /** Reads one project's name, root, and tags from its `project.json`. */
  public readProjectScope(args: ReadProjectScopeArguments): ProjectScope {
    const root = path.dirname(args.projectConfigurationFile);
    const parsed: unknown = JSON.parse(
      readFileSync(
        path.resolve(args.workspaceRoot, args.projectConfigurationFile),
        "utf8",
      ),
    );
    const configuration: { name?: unknown; tags?: unknown } =
      typeof parsed === "object" && parsed !== null ? { ...parsed } : {};
    const tags = this.isUnknownArray(configuration.tags)
      ? configuration.tags
      : [];

    const projectName =
      typeof configuration.name === "string" ? configuration.name : root;
    const stringTags = tags.filter(
      (tag): tag is string => typeof tag === "string",
    );

    return {
      name: projectName,
      root,
      tags: [...stringTags, `name:${projectName}`],
    };
  }
}
