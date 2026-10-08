import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { GenerationService } from "@conformetry/generation";
import { ReportingService } from "@conformetry/output";
import { ValidationService } from "@conformetry/validation";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { AdapterService } from "../adapter/adapter.service";
import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_PACKAGE_NAME,
} from "../generator/generator.constants";
import { GeneratorService } from "../generator/generator.service";
import { InstancesService } from "../instances/instances.service";
import {
  CONFORMETRY_NX_PLUGIN_NAME,
  NX_CONFIGURATION_FILENAME,
} from "../options/options.constants";
import { OptionsService } from "../options/options.service";
import { PathsService } from "../paths/paths.service";
import { ProjectsService } from "../projects/projects.service";

import {
  PROJECT_CONFIGURATION_FILENAME,
  WORKSPACE_PROJECT_ROOT,
} from "./plugin.constants";

import type { ConformetryPluginOptions } from "../options/options.types";
import type {
  InferredTargets,
  InferTargetsArguments,
  RunGeneratorArguments,
  RunValidationArguments,
  RunValidationResult,
} from "./plugin.types";
import type { TemplateDefinition } from "@conformetry/configuration";

/**
 * The plugin's whole surface: infer targets, generate, validate.
 *
 * Every entry point resolves the plugin's options and the conformetry
 * configuration itself rather than taking them apart, so the Nx-facing
 * functions in `index.ts` stay thin wrappers with no logic of their own.
 */
@Injectable()
export class PluginService {
  // 🏗 Dependency Injection

  constructor(
    private readonly adapterService: AdapterService,
    private readonly instancesService: InstancesService,
    private readonly configurationService: ConfigurationService,
    private readonly generatorService: GeneratorService,
    private readonly generationService: GenerationService,
    private readonly optionsService: OptionsService,
    private readonly pathsService: PathsService,
    private readonly projectsService: ProjectsService,
    private readonly reportingService: ReportingService,
    private readonly validationService: ValidationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PluginService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Fails when the emitted Nx plugin no longer matches the configuration.
   *
   * `generators.json` and its schemas are derived from `conformetry.config.ts`,
   * so an edit to the configuration that is not followed by `nx sync` leaves Nx
   * offering generators that no longer exist, or hiding ones that do. Comparing
   * here rather than trusting `nx sync:check` means the plugin's own commands
   * cannot run against a stale plugin.
   */
  private async assertEmittedPluginCurrent(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<void> {
    const emittedFiles = await this.generatorService.emitPlugin({
      configurationPath: args.configurationPath,
      outputPath: DEFAULT_OUTPUT_PATH,
      packageName: DEFAULT_PACKAGE_NAME,
      projects: this.projectsService.listWorkspaceProjects(args.workspaceRoot),
    });

    for (const emittedFile of emittedFiles) {
      const absolutePath = path.resolve(
        args.workspaceRoot,
        emittedFile.filePath,
      );
      const onDisk = existsSync(absolutePath)
        ? readFileSync(absolutePath, "utf8")
        : undefined;

      if (onDisk !== emittedFile.content) {
        this.logger.warn(
          "🚫 Rejected a stale conformetry generator plugin",
          undefined,
          { filePath: emittedFile.filePath },
        );
        throw new Error(
          `${emittedFile.filePath} is out of date with ${args.configurationPath}. Run \`nx sync\` to regenerate the conformetry generator plugin.`,
        );
      }
    }
  }

  /** Fails fast when the plugin would run against a stale or broken setup. */
  private async assertPluginInSync(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<void> {
    await this.assertTemplatesExist(args);
    await this.assertEmittedPluginCurrent(args);
  }

  /**
   * Fails when a configured generator points at a template that is not there.
   *
   * Template contents never reach `generators.json`, so a missing template
   * directory is invisible to the drift check above: the emitted plugin still
   * matches the configuration, and the failure only surfaces later as an empty
   * generation or an instance matching nothing.
   */
  private async assertTemplatesExist(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<void> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );

    for (const generator of configuration) {
      const templateDirectoryPath = path.resolve(
        args.workspaceRoot,
        generator.templatePath,
      );

      if (!existsSync(templateDirectoryPath)) {
        this.logger.warn(
          "🚫 Rejected a generator with a missing template",
          undefined,
          { generator: generator.name, templatePath: generator.templatePath },
        );
        throw new Error(
          `Generator ${generator.name} names a template at ${generator.templatePath}, which does not exist.`,
        );
      }
    }
  }

  /** Reads the workspace's `nx.json`, or nothing when there is none. */
  private readNxConfiguration(workspaceRoot: string): unknown {
    const nxConfigurationPath = path.resolve(
      workspaceRoot,
      NX_CONFIGURATION_FILENAME,
    );

    if (!existsSync(nxConfigurationPath)) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(
      readFileSync(nxConfigurationPath, "utf8"),
    );

    return parsed;
  }

  /**
   * Resolves this plugin's options against the workspace's registration.
   *
   * Nx passes plugin options to `createNodes` but not to a generator or to an
   * inferred target's executor, which see only what the caller typed. Reading
   * `nx.json` here rather than trusting a default is what lets a workspace keep
   * its configuration somewhere other than the conventional path: the
   * registration is the base, and anything Nx did pass wins over it.
   */
  private resolveOptions(args: {
    options: unknown;
    workspaceRoot: string;
  }): ConformetryPluginOptions {
    const registered = this.optionsService.resolveConfigurationPath({
      exists: (candidatePath) => {
        return existsSync(path.resolve(args.workspaceRoot, candidatePath));
      },
      nxConfiguration: this.readNxConfiguration(args.workspaceRoot),
    });
    const passed: Record<string, unknown> =
      typeof args.options === "object" && args.options !== null
        ? { ...args.options }
        : {};

    return this.optionsService.resolvePluginOptions({
      configurationPath: registered,
      ...passed,
    });
  }

  /**
   * Builds one input glob per configured generator's template folder.
   *
   * A template's own files are not part of `configurationPath` or the emitted
   * plugin, so without this an instance's validate target would keep a stale
   * cache hit across an edit to the very template it is measured against —
   * which is exactly how a broken template placeholder once reached every
   * matched instance's `package.json` unnoticed.
   */
  private async resolveTemplateInputs(args: {
    configurationPath: string;
  }): Promise<string[]> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const templatePaths = new Set(
      configuration.map((generator) => generator.templatePath),
    );

    return [...templatePaths].map(
      (templatePath) => `{workspaceRoot}/${templatePath}/**/*`,
    );
  }

  /** Reads every configured generator's template folder. */
  private async resolveTemplates(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<TemplateDefinition[]> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );

    return configuration.map((generator) => {
      return this.configurationService.collectTemplate({
        name: generator.name,
        templatePath: path.resolve(args.workspaceRoot, generator.templatePath),
        threshold: generator.threshold,
      });
    });
  }

  // 🌎 Public Methods

  /**
   * Infers a validation target onto every project that holds at least one
   * instance.
   *
   * Projects with nothing to validate get no target at all, rather than a
   * target that trivially passes — an empty target still costs a task in every
   * `run-many`, and it makes `nx show project` claim a capability the project
   * does not have.
   */
  public async inferTargets(
    args: InferTargetsArguments,
  ): Promise<Map<string, InferredTargets>> {
    const pluginOptions = this.resolveOptions({
      options: args.options,
      workspaceRoot: args.workspaceRoot,
    });
    const templateInputs = await this.resolveTemplateInputs({
      configurationPath: pluginOptions.configurationPath,
    });
    const targetsByProjectRoot = new Map<string, InferredTargets>();

    for (const projectConfigurationFile of args.projectConfigurationFiles.filter(
      (filePath) => {
        return path.basename(filePath) === PROJECT_CONFIGURATION_FILENAME;
      },
    )) {
      const project = this.projectsService.readProjectScope({
        projectConfigurationFile,
        workspaceRoot: args.workspaceRoot,
      });

      if (project.root === WORKSPACE_PROJECT_ROOT) {
        continue;
      }

      const instances = await this.instancesService.findProjectInstances({
        configurationPath: pluginOptions.configurationPath,
        project,
        workspaceRoot: args.workspaceRoot,
      });

      if (instances.length === 0) {
        continue;
      }

      targetsByProjectRoot.set(project.root, {
        [pluginOptions.validateTargetName]: {
          cache: true,
          executor: `${CONFORMETRY_NX_PLUGIN_NAME}:validate`,
          // The executor refuses to run against a drifted plugin, so the
          // configuration and the emitted plugin are inputs: without them a
          // cache hit would skip that check entirely. Every configured
          // template folder joins them for the same reason — see
          // `resolveTemplateInputs`.
          inputs: [
            "default",
            `{workspaceRoot}/${pluginOptions.configurationPath}`,
            `{workspaceRoot}/${DEFAULT_OUTPUT_PATH}/**/*`,
            ...templateInputs,
          ],
          options: {},
        },
      });
    }

    return targetsByProjectRoot;
  }

  /**
   * Runs one configured generator against an Nx tree.
   *
   * Nothing is written to disk here — the tree records the writes and Nx
   * decides whether to flush them, which is what makes `--dry-run` honest.
   */
  public async runGenerator(args: RunGeneratorArguments): Promise<string[]> {
    const pluginOptions = this.resolveOptions({
      options: args.options,
      workspaceRoot: args.workspaceRoot,
    });
    await this.assertPluginInSync({
      configurationPath: pluginOptions.configurationPath,
      workspaceRoot: args.workspaceRoot,
    });

    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        pluginOptions.configurationPath,
      );
    const definition = configuration.find((generator) => {
      return generator.name === args.generatorName;
    });

    if (definition === undefined) {
      this.logger.error("🚫 Rejected an unknown generator", undefined, {
        generator: args.generatorName,
      });
      throw new Error(
        `Unknown conformetry generator: ${args.generatorName}. Configured generators: ${configuration.map((generator) => generator.name).join(", ")}.`,
      );
    }

    const adapters = this.adapterService.createAdapters({
      tree: args.tree,
      workspaceRoot: args.workspaceRoot,
    });
    const inputs = this.optionsService.resolveGeneratorInputs(args.options);
    const { generatedFilePaths } = await this.generationService.runGenerator({
      definition: {
        name: definition.name,
        templateDirectoryPath: path.resolve(
          args.workspaceRoot,
          definition.templatePath,
        ),
      },
      filesystem: adapters.filesystem,
      formatter: adapters.formatter,
      inputs,
      instancePath: await this.pathsService.resolveGenerationPath({
        configurationPath: pluginOptions.configurationPath,
        generatorName: args.generatorName,
        inputs,
        tree: args.tree,
        workspaceRoot: args.workspaceRoot,
      }),
    });

    this.logger.info("✨ Generated instance files", undefined, {
      count: generatedFilePaths.length,
      generator: args.generatorName,
    });

    return generatedFilePaths;
  }

  /** Validates one project's instances and renders the report. */
  public async runValidation(
    args: RunValidationArguments,
  ): Promise<RunValidationResult> {
    const pluginOptions = this.resolveOptions({
      options: args.options,
      workspaceRoot: args.workspaceRoot,
    });
    await this.assertPluginInSync({
      configurationPath: pluginOptions.configurationPath,
      workspaceRoot: args.workspaceRoot,
    });

    const result = this.validationService.validate({
      instances: await this.instancesService.findProjectInstances({
        configurationPath: pluginOptions.configurationPath,
        project: args.project,
        workspaceRoot: args.workspaceRoot,
      }),
      ...(args.languageNames === undefined
        ? {}
        : { languageNames: args.languageNames }),
      templates: await this.resolveTemplates({
        configurationPath: pluginOptions.configurationPath,
        workspaceRoot: args.workspaceRoot,
      }),
      ...(args.threshold === undefined ? {} : { threshold: args.threshold }),
    });

    this.logger.info("👔 Validated conformetry instances", undefined, {
      ok: result.ok,
    });

    return {
      ok: result.ok,
      report: this.reportingService.formatReport({
        fileResults: result.fileResults,
        scores: result.scores,
        workingDirectory: args.workspaceRoot,
      }),
    };
  }
}
