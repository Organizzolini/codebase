import path from "node:path";

import { Injectable } from "@nestjs/common";

import { InstanceGroupService } from "../instance-group/instance-group.service";
import { TemplateDiscoveryService } from "../template-discovery/template-discovery.service";

import { InstanceDiscoveryLocatingService } from "./instance-discovery-locating.service";
import { InstanceDiscoveryMatchingService } from "./instance-discovery-matching.service";

import type { ConformetryInstanceGroup } from "../instance-group/instance-group.types.js";
import type { TemplateDefinition } from "../template-discovery/template-discovery.types.js";
import type {
  FindInstancesArguments,
  Instance,
  InstanceFile,
  MatchedInstance,
  PreparedInstanceDocuments,
  PrepareDocumentsArguments,
  ResolvedInstances,
  ResolveInventoryArguments,
} from "./instance-discovery.types.js";
import type {
  InventoriedInstance,
  InventoriedPairing,
  InventoriedTemplate,
} from "@conformetry/core";

/**
 * Finds the generated code a workspace holds, and decides what explains it.
 *
 * This is the workspace-facing half of discovery: the template-discovery module
 * reads the templates root, and this one reads the tree those templates were
 * rendered into. Matching lives here because every answer it produces is
 * instance-shaped — a matched instance, an unmatched one, or a ranking of
 * templates against one path.
 */
@Injectable()
export class InstanceDiscoveryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly instanceDiscoveryLocatingService: InstanceDiscoveryLocatingService,
    private readonly instanceDiscoveryMatchingService: InstanceDiscoveryMatchingService,
    private readonly instanceGroupService: InstanceGroupService,
    private readonly templateDiscoveryService: TemplateDiscoveryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The globs an inventory expands: the configured groups' patterns and
   * exclusions, or an explicit pattern list replacing both.
   *
   * One expansion rather than one per group, so an instance two groups locate
   * is listed once; every group's exclusions therefore apply to all of them.
   */
  private readInventoryGlobs(
    args: ResolveInventoryArguments,
  ): FindInstancesArguments {
    if (args.instancePatterns !== undefined) {
      return {
        patterns: args.instancePatterns,
        workingDirectory: args.workingDirectory,
      };
    }

    const groups = args.configuration.flatMap((generator) => {
      return this.readWorkspaceGroups(generator.instances);
    });

    return {
      exclude: groups.flatMap((group) => group.exclude ?? []),
      patterns: groups.flatMap((group) => group.patterns ?? []),
      workingDirectory: args.workingDirectory,
    };
  }

  /** Weighs one instance against every template, best fit first. */
  private weighInstance(args: {
    instance: Instance;
    templates: TemplateDefinition[];
  }): { instance: Instance; pairings: InventoriedPairing[] } {
    const pairings = this.instanceDiscoveryMatchingService
      .matchTemplates({
        instance: args.instance,
        substitutions: this.instanceDiscoveryMatchingService.buildSubstitutions(
          args.instance,
        ),
        templates: args.templates,
      })
      .map((match): InventoriedPairing => {
        return {
          matchedFileCount: match.matchedFileCount,
          matchRatio: match.matchRatio,
          name: match.template.name,
          templateFileCount: match.template.filePaths.length,
        };
      });

    return { instance: args.instance, pairings };
  }

  // 🌎 Public Methods

  /** Builds the substitutions an instance's template is rendered with. */
  public buildSubstitutions(
    instance: Instance,
  ): ReturnType<InstanceDiscoveryMatchingService["buildSubstitutions"]> {
    return this.instanceDiscoveryMatchingService.buildSubstitutions(instance);
  }

  /** Expands instance globs into the instances that exist. */
  public findInstances(args: FindInstancesArguments): Instance[] {
    return this.instanceDiscoveryLocatingService.findInstances(args);
  }

  /** Resolves every instance to the template, or templates, that explain it. */
  public matchInstances(args: {
    instances: Instance[];
    templates: TemplateDefinition[];
  }): ResolvedInstances {
    return this.instanceDiscoveryMatchingService.matchInstances(args);
  }

  /** Ranks every template that shares a file with one instance, best first. */
  public matchTemplates(
    args: Parameters<InstanceDiscoveryMatchingService["matchTemplates"]>[0],
  ): ReturnType<InstanceDiscoveryMatchingService["matchTemplates"]> {
    return this.instanceDiscoveryMatchingService.matchTemplates(args);
  }

  /**
   * Prepares the rendered template and instance document pairs for each matched
   * instance, restricted to the extensions the caller's languages claim.
   */
  public prepareDocuments(
    args: PrepareDocumentsArguments,
  ): PreparedInstanceDocuments[] {
    const extensions = new Set(args.fileExtensions);

    return args.instances.map((instance) => {
      return {
        documents: instance.template.filePaths
          .filter((templateFilePath) => {
            return extensions.has(path.extname(templateFilePath));
          })
          .map((templateFilePath) => {
            return this.templateDiscoveryService.prepareDocument({
              instancePath: instance.instance.path,
              substitutions: instance.substitutions,
              templateDirectoryPath: instance.template.directoryPath,
              templateFilePath,
            });
          })
          .filter((document) => document !== undefined),
        instance,
      };
    });
  }

  /**
   * Keeps the groups a host with no project graph can actually locate.
   *
   * A group carrying `tags` reads its globs *inside each project the tags
   * select*, so `src/modules/*` has no meaning until a project root is joined
   * to it. This package has no notion of a project, so such a group is not
   * addressed to it and is left out rather than expanded from the working
   * directory — which would match whatever happened to sit at the same
   * relative path and measure it against a template scoped to other projects.
   * `@conformetry/nx` resolves those groups first, so what reaches discovery
   * from there is already workspace-relative and untagged groups are all that
   * is left to read.
   *
   * Dropping them is deliberately silent here and reported by the caller: this
   * is a question about one group, and only a command knows whether the run it
   * was asked for has been left with nothing.
   *
   * Which groups those are is `InstanceGroupService`'s to say, so that this and
   * the set `@conformetry/nx` claims stay exact complements.
   */
  public readWorkspaceGroups(
    groups: readonly ConformetryInstanceGroup[],
  ): ConformetryInstanceGroup[] {
    return groups.filter((group) => {
      return !this.instanceGroupService.isProjectScoped(group);
    });
  }

  /** Lists every file a matched instance's template requires it to have. */
  public resolveInstanceFiles(instances: MatchedInstance[]): InstanceFile[] {
    return instances.flatMap((instance) => {
      return instance.template.filePaths.map((templateFilePath) => {
        return {
          instance,
          instanceFilePath:
            this.templateDiscoveryService.resolveInstanceFilePath({
              instancePath: instance.instance.path,
              substitutions: instance.substitutions,
              templateDirectoryPath: instance.template.directoryPath,
              templateFilePath,
            }),
          templateFilePath,
        };
      });
    });
  }

  /**
   * Lists every instance found, paired with the templates that explain it.
   *
   * `templateNames` narrows the pairing rather than the search, so an instance
   * that no named template explains drops out entirely.
   */
  public resolveInventoriedInstances(
    args: ResolveInventoryArguments,
  ): InventoriedInstance[] {
    const { templates, weighed } = this.takeInventory(args);
    const wanted = new Set(
      args.templateNames ?? templates.map((template) => template.name),
    );

    return weighed
      .map(({ instance, pairings }) => {
        return {
          path: path.join(instance.path, instance.nameStem),
          templates: pairings.filter((pairing) => wanted.has(pairing.name)),
        };
      })
      .filter((instance) => instance.templates.length > 0);
  }

  /**
   * Lists every template declared, paired with the instances it explains.
   *
   * `instancePatterns` narrows which instances are considered, which is what
   * turns this into "which templates explain this path". A path can legitimately
   * belong to several templates, so every one that fits is reported.
   */
  public resolveInventoriedTemplates(
    args: ResolveInventoryArguments,
  ): InventoriedTemplate[] {
    const { weighed } = this.takeInventory(args);
    const filtering = args.instancePatterns !== undefined;

    return args.configuration
      .filter(
        (generator) =>
          args.templateNames === undefined ||
          args.templateNames.includes(generator.name),
      )
      .map((generator) => {
        const instances = weighed.flatMap(({ instance, pairings }) => {
          const pairing = pairings.find(
            (entry) => entry.name === generator.name,
          );

          return pairing === undefined
            ? []
            : [
                {
                  ...pairing,
                  name: path.join(instance.path, instance.nameStem),
                },
              ];
        });

        return {
          description: generator.description ?? "",
          instances,
          name: generator.name,
          templatePath: generator.templatePath,
        };
      })
      .filter((template) => !filtering || template.instances.length > 0);
  }

  /** Weighs every instance the globs find against every declared template. */
  public takeInventory(args: ResolveInventoryArguments): {
    templates: TemplateDefinition[];
    weighed: { instance: Instance; pairings: InventoriedPairing[] }[];
  } {
    const templates = this.templateDiscoveryService.collectTemplates({
      configuration: args.configuration,
      workingDirectory: args.workingDirectory,
    });
    const instances = this.findInstances(this.readInventoryGlobs(args));

    return {
      templates,
      weighed: instances.map((instance) =>
        this.weighInstance({ instance, templates }),
      ),
    };
  }
}
