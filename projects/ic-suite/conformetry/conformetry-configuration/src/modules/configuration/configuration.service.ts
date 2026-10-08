import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import { InputPromptingService } from "../input/input-prompting.service";
import { InputService } from "../input/input.service";
import { InstanceDiscoveryService } from "../instance-discovery/instance-discovery.service";
import { InstanceGroupService } from "../instance-group/instance-group.service";
import { RenderingService } from "../rendering/rendering.service";
import { TemplateDiscoveryService } from "../template-discovery/template-discovery.service";

import {
  conformetryConfigurationSchema,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
  WORKSPACE_MANIFEST_FILENAME,
} from "./configuration.constants";

import type { ResolveGeneratorInputsArguments } from "../input/input.types";
import type {
  FindInstancesArguments,
  Instance,
  InstanceFile,
  MatchedInstance,
  PreparedInstanceDocuments,
  PrepareDocumentsArguments,
  ResolvedInstances,
  ResolveInventoryArguments,
} from "../instance-discovery/instance-discovery.types";
import type { ConformetryInstanceGroup } from "../instance-group/instance-group.types";
import type { Substitutions } from "../rendering/rendering.types";
import type { TemplateDefinition } from "../template-discovery/template-discovery.types";
import type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ParsedGeneratorEntry,
} from "./configuration.types";

/**
 * The one answer to "what is this run actually configured to do".
 *
 * Every question a caller outside this package can ask about configuration is
 * asked here: what a config file declares, which templates it points at, which
 * instances exist and what explains them, what a placeholder renders to, and
 * what to ask a person for when an input was left off. A consumer therefore
 * injects this and nothing else from this package, which is what makes the
 * configuration layer one layer rather than a bag of collaborators a caller
 * has to know the names of — the shape callidescope, codependix and codometer
 * already publish.
 *
 * Loading a config file is the one job held here rather than delegated;
 * everything below it is a one-line hand-off. Prompting, option parsing,
 * rendering, template discovery, instance discovery and instance-group reading
 * stay six classes in their own files, because they are six different jobs.
 * What they stop being is six public entry points.
 */
@Injectable()
export class ConfigurationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly inputPromptingService: InputPromptingService,
    private readonly inputService: InputService,
    private readonly instanceDiscoveryService: InstanceDiscoveryService,
    private readonly instanceGroupService: InstanceGroupService,
    private readonly renderingService: RenderingService,
    private readonly templateDiscoveryService: TemplateDiscoveryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Fills in the optional halves of one parsed generator entry.
   *
   * A generator with no inputs and no instances is legal — it renders a fixed
   * template nobody validates — so both default to empty rather than failing.
   */
  private applyGeneratorDefaults(
    definition: ParsedGeneratorEntry,
  ): ConformetryGeneratorDefinition {
    return {
      ...(definition.description === undefined
        ? {}
        : { description: definition.description }),
      inputs: definition.inputs ?? {},
      instances: definition.instances ?? [],
      name: definition.name,
      templatePath: definition.templatePath,
      // Deliberately not defaulted. Stamping every generator with 1 here would
      // make the generator level always beat a run-level `--threshold`, which
      // would leave that flag with nothing it could ever change.
      ...(definition.threshold === undefined
        ? {}
        : { threshold: definition.threshold }),
    };
  }

  /**
   * Walks upward from the process cwd looking for the workspace manifest.
   *
   * Used to resolve a config path given relative to the workspace root even
   * when the command was invoked from a nested directory.
   */
  private async findWorkspaceRoot(): Promise<string | undefined> {
    let candidateDirectory = path.resolve(process.cwd());

    for (;;) {
      try {
        await access(
          path.join(candidateDirectory, WORKSPACE_MANIFEST_FILENAME),
        );
        return candidateDirectory;
      } catch {
        const parentDirectory = path.dirname(candidateDirectory);

        if (parentDirectory === candidateDirectory) {
          return undefined;
        }

        candidateDirectory = parentDirectory;
      }
    }
  }

  /** Loads a config module, choosing the reader by extension. */
  private async loadConfigurationModule(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    if (args.extension === ".json" || args.extension === ".jsonc") {
      return this.loadJsonConfiguration(args);
    }

    const jiti = createJiti(fileURLToPath(import.meta.url));
    const importedModule: unknown = await jiti.import(args.configurationPath, {
      default: true,
    });

    if (typeof importedModule !== "object" || importedModule === null) {
      return [];
    }

    const defaultExport = (importedModule as { default?: unknown }).default;

    return typeof defaultExport === "object" && defaultExport !== null
      ? defaultExport
      : importedModule;
  }

  /** Reads a JSON or JSONC config file. */
  private async loadJsonConfiguration(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    const configurationContent = await readFile(args.configurationPath, "utf8");

    return args.extension === ".jsonc"
      ? parseJsonc(configurationContent)
      : JSON.parse(configurationContent);
  }

  /**
   * Resolves a config path against the cwd, falling back to the workspace root.
   */
  private async resolveConfigurationPath(
    configurationPath: string,
  ): Promise<string> {
    const absolutePath = path.resolve(configurationPath);

    if (existsSync(absolutePath)) {
      return absolutePath;
    }

    const workspaceRoot = await this.findWorkspaceRoot();

    if (workspaceRoot === undefined) {
      return absolutePath;
    }

    const workspaceRelativePath = path.resolve(
      workspaceRoot,
      configurationPath,
    );

    return existsSync(workspaceRelativePath)
      ? workspaceRelativePath
      : absolutePath;
  }

  // 🌎 Public Methods

  /** Derives the case variants every template can reference from one name. */
  public buildNameSubstitutions(name: string): Substitutions {
    return this.renderingService.buildNameSubstitutions(name);
  }

  /** Reads one template folder. */
  public collectTemplate(
    args: Parameters<TemplateDiscoveryService["collectTemplate"]>[0],
  ): TemplateDefinition {
    return this.templateDiscoveryService.collectTemplate(args);
  }

  /** Reads every configured generator's template folder. */
  public collectTemplates(args: {
    configuration: ConformetryConfiguration;
    workingDirectory: string;
  }): TemplateDefinition[] {
    return this.templateDiscoveryService.collectTemplates(args);
  }

  /** Expands instance globs into the instances that exist. */
  public findInstances(args: FindInstancesArguments): Instance[] {
    return this.instanceDiscoveryService.findInstances(args);
  }

  /** Whether anybody is there to answer a question. */
  public isAtTerminal(): boolean {
    return this.inputPromptingService.isAtTerminal();
  }

  /** Whether a group locates its instances inside the hosts its tags select. */
  public isProjectScoped(group: ConformetryInstanceGroup): boolean {
    return this.instanceGroupService.isProjectScoped(group);
  }

  /**
   * Loads, validates, and normalizes a conformetry configuration file.
   *
   * Throws `UnknownConfigurationFileTypeError` for an unreadable extension, and
   * propagates the Zod error for a malformed registry — a bad config should
   * fail loudly rather than silently validate nothing.
   */
  public async loadConformetryConfiguration(
    configurationPath: string,
  ): Promise<ConformetryConfiguration> {
    const resolvedPath = await this.resolveConfigurationPath(configurationPath);
    const extension = path.extname(resolvedPath).toLowerCase();

    if (!SUPPORTED_CONFIGURATION_EXTENSIONS.has(extension)) {
      throw new UnknownConfigurationFileTypeError(resolvedPath);
    }

    const configurationModule = await this.loadConfigurationModule({
      configurationPath: resolvedPath,
      extension,
    });
    return conformetryConfigurationSchema
      .parse(configurationModule)
      .map((definition) => this.applyGeneratorDefaults(definition));
  }

  /** Resolves every instance to the template, or templates, that explain it. */
  public matchInstances(args: {
    instances: Instance[];
    templates: TemplateDefinition[];
  }): ResolvedInstances {
    return this.instanceDiscoveryService.matchInstances(args);
  }

  /** Splits a comma-delimited filter option into its values. */
  public parseCommaDelimitedOption(
    value: string | undefined,
  ): string[] | undefined {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Trims an optional string option, treating blank as absent. */
  public parseOptionalOption(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses a threshold option as a ratio from 0 to 1. */
  public parseThresholdOption(value: string | undefined): number | undefined {
    return this.inputService.parseThresholdOption(value);
  }

  /**
   * Prepares the rendered template and instance document pairs for each matched
   * instance, restricted to the extensions the caller's languages claim.
   */
  public prepareDocuments(
    args: PrepareDocumentsArguments,
  ): PreparedInstanceDocuments[] {
    return this.instanceDiscoveryService.prepareDocuments(args);
  }

  /** Asks which single template to run, filtering as the caller types. */
  public async promptForTemplate(
    templates: Parameters<InputPromptingService["promptForTemplate"]>[0],
  ): Promise<string | undefined> {
    return this.inputPromptingService.promptForTemplate(templates);
  }

  /** Asks which templates to narrow a run to. */
  public async promptForTemplates(
    templates: Parameters<InputPromptingService["promptForTemplates"]>[0],
  ): Promise<string[] | undefined> {
    return this.inputPromptingService.promptForTemplates(templates);
  }

  /** Keeps the groups a host with no project graph can actually locate. */
  public readWorkspaceGroups(
    groups: readonly ConformetryInstanceGroup[],
  ): ConformetryInstanceGroup[] {
    return this.instanceDiscoveryService.readWorkspaceGroups(groups);
  }

  /** Renders template contents with mustache. */
  public renderContent(
    args: Parameters<RenderingService["renderContent"]>[0],
  ): string {
    return this.renderingService.renderContent(args);
  }

  /** Renders a template path with mustache. */
  public renderPath(
    args: Parameters<RenderingService["renderPath"]>[0],
  ): string {
    return this.renderingService.renderPath(args);
  }

  /** Resolves generator inputs from raw command-line arguments. */
  public async resolveGeneratorInputs(
    args: ResolveGeneratorInputsArguments,
  ): Promise<Record<string, string>> {
    return this.inputService.resolveGeneratorInputs(args);
  }

  /** Lists every file a matched instance's template requires it to have. */
  public resolveInstanceFiles(instances: MatchedInstance[]): InstanceFile[] {
    return this.instanceDiscoveryService.resolveInstanceFiles(instances);
  }

  /** Lists every instance found, paired with the templates that explain it. */
  public resolveInventoriedInstances(
    args: ResolveInventoryArguments,
  ): ReturnType<InstanceDiscoveryService["resolveInventoriedInstances"]> {
    return this.instanceDiscoveryService.resolveInventoriedInstances(args);
  }

  /** Lists every template declared, paired with the instances it explains. */
  public resolveInventoriedTemplates(
    args: ResolveInventoryArguments,
  ): ReturnType<InstanceDiscoveryService["resolveInventoriedTemplates"]> {
    return this.instanceDiscoveryService.resolveInventoriedTemplates(args);
  }
}
