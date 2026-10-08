import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Injectable } from "@nestjs/common";
import { ModulesContainer, NestFactory } from "@nestjs/core";

import { LoggerService } from "@codebase/logging";

import { SyntheticRootModule } from "./nestjs-project-synthetic.module";
import {
  NESTJS_PROJECT_IGNORED_MODULES,
  NESTJS_PROJECT_MODULE_FILE_SUFFIX,
  NESTJS_PROJECT_ROOT_MODULE_EXPORT,
  NESTJS_PROJECT_ROOT_MODULE_FILE,
  NESTJS_PROJECT_SYNTHETIC_IGNORED_MODULES,
  NESTJS_PROJECT_TAG,
} from "./nestjs-project.constants";

import type {
  NestjsExploredModule,
  NestjsProject,
} from "./nestjs-project.types";
import type {
  DynamicModule,
  INestApplicationContext,
  Type,
} from "@nestjs/common";

/**
 * Discovers the workspace's `framework:nestjs` projects and explores each
 * one's container.
 *
 * Ported from `projects/synchronization`'s `nestjs-module-graphs` command (see
 * issue #242), which this package replaces: exploration still runs the
 * container in NestJS preview mode, which registers every module and
 * provider without instantiating any of them. That is what makes a project
 * safe to graph from a workstation or from CI: a project building a
 * `TypeOrmModule.forRootAsync` options factory never has a database
 * contacted. Project discovery reads the tags each project already carries
 * rather than walking the filesystem for a `project.json`, since whoever
 * read the Nx project graph for the Nx exports has already collected them.
 */
@Injectable()
export class NestjsProjectService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(NestjsProjectService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Roots a package that bootstraps nothing in every module it defines. */
  private async buildSyntheticRootModule(
    project: NestjsProject,
  ): Promise<DynamicModule> {
    const moduleFiles = this.findModuleFiles(
      path.join(project.absoluteRoot, "src"),
    );
    const loadedClasses = await Promise.all(
      moduleFiles.map(async (file) => this.loadModuleClasses(file)),
    );

    return SyntheticRootModule.forModules(loadedClasses.flat());
  }

  /**
   * Discovers declaring files for every module in a project, relative to its
   * root.
   */
  private async discoverModuleDeclaringFiles(
    project: NestjsProject,
  ): Promise<Map<string, string>> {
    const moduleFiles = this.findModuleFiles(
      path.join(project.absoluteRoot, "src"),
    );

    if (
      project.rootModuleFile !== undefined &&
      !moduleFiles.includes(project.rootModuleFile)
    ) {
      moduleFiles.push(project.rootModuleFile);
    }

    const declaringFiles = new Map<string, string>();

    for (const file of moduleFiles) {
      const relativePath = path
        .relative(project.absoluteRoot, file)
        .replaceAll("\\", "/");
      const loadedClasses = await this.loadModuleClasses(file);

      for (const moduleClass of loadedClasses) {
        declaringFiles.set(moduleClass.name, relativePath);
      }
    }

    return declaringFiles;
  }

  /**
   * Lists every module in a container with the modules it imports, both by
   * class name and in the container's registration order, leaving the ignored
   * modules out of the list and out of every import.
   *
   * Reads the container through its public `ModulesContainer` provider, which
   * a preview-mode container still hands out because NestJS registers it as a
   * value. The container's view is what `import` edges report, so a global
   * module appears as an import of every module rather than only of those
   * that name it.
   */
  private exploreContainer(
    application: INestApplicationContext,
    ignoredModules: RegExp[],
  ): NestjsExploredModule[] {
    const modules = [...application.get(ModulesContainer).values()];
    const exploredNames = new Set<string>();

    for (const { name } of modules) {
      if (!ignoredModules.some((pattern) => pattern.test(name))) {
        exploredNames.add(name);
      }
    }

    const explored: NestjsExploredModule[] = [];

    for (const { imports, name } of modules) {
      if (!exploredNames.has(name)) continue;

      explored.push({
        imports: [...imports]
          .map((importedModule) => importedModule.name)
          .filter((importedName) => exploredNames.has(importedName)),
        name,
      });
    }

    return explored;
  }

  /** Finds every module definition file beneath a directory. */
  private findModuleFiles(directory: string): string[] {
    if (!existsSync(directory)) return [];

    const moduleFiles: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        moduleFiles.push(...this.findModuleFiles(target));
      } else if (entry.name.endsWith(NESTJS_PROJECT_MODULE_FILE_SUFFIX)) {
        moduleFiles.push(target);
      }
    }

    return moduleFiles.toSorted((first, second) => first.localeCompare(second));
  }

  /** Imports a module file and returns every module class it exports. */
  private async loadModuleClasses(file: string): Promise<Type<unknown>[]> {
    const loaded = (await import(pathToFileURL(file).href)) as Record<
      string,
      Type<unknown> | undefined
    >;

    return Object.entries(loaded)
      .filter(
        (entry): entry is [string, Type<unknown>] =>
          entry[0].endsWith("Module") && typeof entry[1] === "function",
      )
      .map(([, moduleClass]) => moduleClass);
  }

  /** Imports a root module file and returns the module class it exports. */
  private async loadRootModule(rootModuleFile: string): Promise<Type<unknown>> {
    const loaded = (await import(pathToFileURL(rootModuleFile).href)) as Record<
      string,
      Type<unknown> | undefined
    >;
    const rootModule = loaded[NESTJS_PROJECT_ROOT_MODULE_EXPORT];

    if (typeof rootModule !== "function") {
      throw new TypeError(
        `Expected ${rootModuleFile} to export a ${NESTJS_PROJECT_ROOT_MODULE_EXPORT} class`,
      );
    }

    return rootModule;
  }

  // 🌎 Public Methods

  /** Describes a project, noting whether it bootstraps a root module. */
  describeProject(absoluteRoot: string, name: string): NestjsProject {
    const rootModuleFile = path.join(
      absoluteRoot,
      NESTJS_PROJECT_ROOT_MODULE_FILE,
    );

    return {
      absoluteRoot,
      name,
      rootModuleFile: existsSync(rootModuleFile) ? rootModuleFile : undefined,
    };
  }

  /**
   * Filters an already-read list of Nx projects down to the ones tagged
   * `framework:nestjs`, and describes each one.
   *
   * Projects are returned in the order they were given, which callers keep
   * sorted by name — the same order `codependix-nx-projects`'s `NeighborhoodService`
   * reads the Nx project graph's own projects in.
   */
  discoverProjects(
    projects: { absoluteRoot: string; name: string; tags: string[] }[],
  ): NestjsProject[] {
    return projects
      .filter((project) => this.isNestjsProject(project))
      .map((project) =>
        this.describeProject(project.absoluteRoot, project.name),
      );
  }

  /** Explores a project's container in preview mode and returns its tree. */
  async exploreProject(
    project: NestjsProject,
  ): Promise<NestjsExploredModule[]> {
    const { rootModuleFile } = project;
    const rootModule =
      rootModuleFile === undefined
        ? await this.buildSyntheticRootModule(project)
        : await this.loadRootModule(rootModuleFile);
    const declaringFiles = await this.discoverModuleDeclaringFiles(project);

    const application = await NestFactory.createApplicationContext(rootModule, {
      abortOnError: false,
      logger: false,
      preview: true,
    });

    let tree: NestjsExploredModule[];

    try {
      tree = this.exploreContainer(application, [
        ...NESTJS_PROJECT_IGNORED_MODULES,
        ...(rootModuleFile === undefined
          ? NESTJS_PROJECT_SYNTHETIC_IGNORED_MODULES
          : []),
      ]);
    } finally {
      this.logger.debug("🚀 Booted a project's container", undefined, {
        project: project.name,
      });
      await application.close();
    }

    return tree.map((node) => ({
      ...node,
      declaringFile: declaringFiles.get(node.name),
    }));
  }

  /** Reports whether a project's Nx tags mark it as a NestJS project. */
  isNestjsProject(project: { tags: string[] }): boolean {
    return project.tags.includes(NESTJS_PROJECT_TAG);
  }
}
