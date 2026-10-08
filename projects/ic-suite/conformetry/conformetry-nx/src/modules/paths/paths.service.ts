import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { getProjects, readProjectConfiguration } from "@nx/devkit";

import { InstancesService } from "../instances/instances.service";
import { ScopeService } from "../scope/scope.service";

import {
  DIRECTORY_INPUT_NAME,
  MODULE_INPUT_NAME,
  PROJECT_INPUT_NAME,
  TYPE_INPUT_NAME,
} from "./paths.constants";

import type { ResolveGenerationPathArguments } from "./paths.types";
import type { Instance } from "@conformetry/configuration";
import type { Tree } from "@nx/devkit";

/**
 * Decides where a generator writes, by reading the workspace it writes into.
 *
 * `conformetry-generation` takes a destination and renders into it; it has no
 * opinion about layout, exactly as `conformetry-validation` takes instances
 * and has no opinion about how they were found. Layout is Nx-shaped knowledge,
 * so it is answered here — and answered by looking at the projects and module
 * folders that already exist, rather than by a configured convention that
 * would go stale the moment one project deviated.
 */
@Injectable()
export class PathsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly instancesService: InstancesService,
    private readonly configurationService: ConfigurationService,
    private readonly scopeService: ScopeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Locates a named module, refusing one the project does not have.
   *
   * Naming a module means writing into one that exists. Placing the files at a
   * made-up path instead scattered a stray directory across the project root
   * and reported success, which reads as the generator having worked.
   */
  private requireModulePath(args: {
    instances: Instance[];
    moduleName: string;
    projectName: string;
  }): string {
    const modulePath = this.resolveModulePath({
      instances: args.instances,
      moduleName: args.moduleName,
    });

    if (modulePath === undefined) {
      throw new Error(
        `Project ${args.projectName} has no module named ${args.moduleName}. Generate the module first, or name one of its existing modules.`,
      );
    }

    return modulePath;
  }

  /**
   * Infers where a project keeps its modules, from where its modules already
   * are.
   *
   * The directory holding the most of them wins, which is what makes this
   * robust: one stray directory alongside `src/modules` does not move new
   * modules next to it. Returns `undefined` for a project with no modules yet,
   * because there is then nothing to infer from and guessing a convention is
   * how a generic package acquires one repository's layout.
   */
  private resolveModuleParentPath(args: {
    instances: Instance[];
    projectRootPath: string;
  }): string | undefined {
    const countsByParent = new Map<string, number>();

    console.log("instances", args.instances);

    for (const instance of args.instances) {
      // An instance's path is already the parent: the template supplies the
      // folder, so nothing is stripped here.
      const parentPath = instance.path;

      if (!parentPath.startsWith(args.projectRootPath + path.sep)) {
        continue;
      }

      countsByParent.set(parentPath, (countsByParent.get(parentPath) ?? 0) + 1);
    }

    console.log("countsByParent", [...countsByParent.entries()]);

    return [...countsByParent.entries()].toSorted(
      ([left, leftCount], [right, rightCount]) => {
        return rightCount - leftCount || left.localeCompare(right);
      },
    )[0]?.[0];
  }

  /**
   * Finds the directory holding an existing module of the given name.
   *
   * Used when a generator adds files to a module rather than creating one —
   * `nestjs-service-file` writes a service into a module that already exists,
   * so the module has to be located rather than placed.
   */
  private resolveModulePath(args: {
    instances: Instance[];
    moduleName: string;
  }): string | undefined {
    const instance = args.instances.find((entry) => {
      return entry.nameStem === args.moduleName;
    });

    return instance === undefined
      ? undefined
      : path.join(instance.path, instance.nameStem);
  }

  /**
   * Places a project that does not exist yet, which is why no project lookup
   * can answer this. An unrecognized type is used verbatim, so the first
   * project of a new type still lands somewhere sensible.
   */
  private resolveNewProjectPath(args: {
    tree: Tree;
    type: string | undefined;
    workspaceRoot: string;
  }): string {
    if (args.type === undefined) {
      return args.workspaceRoot;
    }

    return path.resolve(
      args.workspaceRoot,
      this.resolveTypeDirectoryPath({ tree: args.tree, type: args.type }) ??
        args.type,
    );
  }

  /**
   * The folder a generator's scope places new instances in, if it names one.
   *
   * Preferred over inferring from existing instances, because a scope is the
   * author stating where instances belong — inference only guesses it, and
   * guesses nothing at all in a project that has none yet.
   */
  private async resolveScopedDirectory(args: {
    configurationPath: string;
    generatorName: string | undefined;
  }): Promise<string | undefined> {
    if (args.generatorName === undefined) {
      return undefined;
    }

    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const definition = configuration.find((generator) => {
      return generator.name === args.generatorName;
    });

    return definition === undefined
      ? undefined
      : this.scopeService.resolveScopedDirectory(definition.instances);
  }

  /**
   * Infers the workspace directory a new project of a given type belongs in,
   * from where projects of that type already live.
   *
   * `type: "packages"` resolves to whichever directory actually holds the
   * workspace's packages, so the answer stays right in a workspace that calls
   * it something else.
   */
  private resolveTypeDirectoryPath(args: {
    tree: Tree;
    type: string;
  }): string | undefined {
    for (const [, configuration] of getProjects(args.tree)) {
      const [firstSegment] = configuration.root.split("/");

      if (firstSegment === args.type) {
        return firstSegment;
      }
    }

    return undefined;
  }

  // 🌎 Public Methods

  /**
   * Resolves the absolute directory a generator's template tree is laid over.
   *
   * This is the *parent* of anything the template creates, because a template
   * that produces a folder contains that folder. Falls back to the workspace
   * root when the inputs name nothing to locate.
   */
  public async resolveGenerationPath(
    args: ResolveGenerationPathArguments,
  ): Promise<string> {
    const explicitDirectory = args.inputs[DIRECTORY_INPUT_NAME];

    if (explicitDirectory !== undefined) {
      return path.resolve(args.workspaceRoot, explicitDirectory);
    }

    const projectName = args.inputs[PROJECT_INPUT_NAME];

    if (projectName === undefined) {
      return this.resolveNewProjectPath({
        tree: args.tree,
        type: args.inputs[TYPE_INPUT_NAME],
        workspaceRoot: args.workspaceRoot,
      });
    }

    const project = readProjectConfiguration(args.tree, projectName);
    const projectRootPath = path.resolve(args.workspaceRoot, project.root);
    const instances = await this.instancesService.findProjectInstances({
      configurationPath: args.configurationPath,
      project: {
        name: projectName,
        root: project.root,
        tags: project.tags ?? [],
      },
      workspaceRoot: args.workspaceRoot,
    });
    const moduleName = args.inputs[MODULE_INPUT_NAME];

    if (moduleName !== undefined) {
      return this.requireModulePath({
        instances,
        moduleName,
        projectName: args.inputs[PROJECT_INPUT_NAME] ?? "",
      });
    }

    const scopedDirectory = await this.resolveScopedDirectory({
      configurationPath: args.configurationPath,
      generatorName: args.generatorName,
    });

    if (scopedDirectory !== undefined) {
      return path.join(projectRootPath, scopedDirectory);
    }

    return (
      this.resolveModuleParentPath({ instances, projectRootPath }) ??
      projectRootPath
    );
  }
}
