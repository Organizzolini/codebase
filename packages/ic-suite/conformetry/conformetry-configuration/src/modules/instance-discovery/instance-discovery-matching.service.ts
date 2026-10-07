import { Injectable } from "@nestjs/common";

import { RenderingService } from "../rendering/rendering.service";
import { createPlaceholderValue } from "../rendering/rendering.utilities";
import { TemplateDiscoveryService } from "../template-discovery/template-discovery.service";

import {
  COMPLETE_MATCH_RATIO,
  MINIMUM_MATCH_RATIO,
} from "./instance-discovery.constants";

import type { Substitutions } from "../rendering/rendering.types";
import type { TemplateDefinition } from "../template-discovery/template-discovery.types";
import type {
  Instance,
  MatchedInstance,
  ResolvedInstances,
  TemplateMatch,
} from "./instance-discovery.types";

/**
 * Decides which template an instance directory was generated from.
 *
 * Nothing declares the answer — an instance is ordinary code with no marker
 * saying where it came from — so the template is inferred from how much of its
 * structure the instance already has.
 */
@Injectable()
export class InstanceDiscoveryMatchingService {
  // 🏗 Dependency Injection

  constructor(
    private readonly templateDiscoveryService: TemplateDiscoveryService,
    private readonly renderingService: RenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Orders template matches best-first.
   *
   * Coverage ratio leads, because absolute count alone lets a large template
   * win on a weak partial match — a module directory matching three of a
   * seven-file GraphQL template would beat nothing, and used to. Absolute
   * count breaks ratio ties, so a five-file module template beats a two-file
   * service-file template when both match completely. Name makes it
   * deterministic.
   */
  private compareMatches(left: TemplateMatch, right: TemplateMatch): number {
    if (left.matchRatio !== right.matchRatio) {
      return right.matchRatio - left.matchRatio;
    }

    if (left.matchedFileCount !== right.matchedFileCount) {
      return right.matchedFileCount - left.matchedFileCount;
    }

    return left.template.name.localeCompare(right.template.name);
  }

  /**
   * Gives every placeholder the substitutions leave out a random stand-in.
   *
   * Only validation matches instances, and there a missing value is something
   * to infer from the instance rather than an error: generation renders
   * without this and still refuses a placeholder nobody supplied. `name` and its
   * variants are always supplied, so they are never stood in for.
   */
  private fillPlaceholders(args: {
    substitutions: Substitutions;
    template: TemplateDefinition;
  }): Pick<TemplateMatch, "placeholderValues" | "substitutions"> {
    const placeholderValues = Object.fromEntries(
      (args.template.placeholderNames ?? [])
        .filter((name) => !Object.hasOwn(args.substitutions, name))
        .map((name) => [name, createPlaceholderValue()]),
    );

    return {
      placeholderValues,
      substitutions: { ...placeholderValues, ...args.substitutions },
    };
  }

  // 🌎 Public Methods

  /**
   * Builds the substitutions an instance's template is rendered with.
   *
   * Name variants come from the instance's stem; caller-supplied values are
   * spread last so an explicit `type` or `description` always wins.
   */
  public buildSubstitutions(instance: Instance): Substitutions {
    return {
      ...this.renderingService.buildNameSubstitutions(instance.nameStem),
      name: instance.nameStem,
      ...instance.substitutions,
    };
  }

  /**
   * Resolves every instance to the template — or templates — that explain it.
   *
   * An instance matching nothing, or matching two templates equally well but
   * only partially, is returned as unmatched rather than dropped: the caller
   * asserted these are instances, so silence would hide both a drifted
   * instance and a pair of indistinguishable templates.
   *
   * A complete tie is different, and is matched against every tied template. A
   * module holding both a command and a service really is an instance of both
   * `nestjs-command-module` and `nestjs-service-module`; calling that ambiguous
   * would demand the author narrow a glob that is not wrong.
   */
  public matchInstances(args: {
    instances: Instance[];
    templates: TemplateDefinition[];
  }): ResolvedInstances {
    const matched: MatchedInstance[] = [];
    const unmatched: ResolvedInstances["unmatched"] = [];

    for (const instance of args.instances) {
      const substitutions = this.buildSubstitutions(instance);
      const matches = this.matchTemplates({
        instance,
        substitutions,
        templates: args.templates,
      });
      const best = matches[0];

      if (best === undefined) {
        unmatched.push({ instance, reason: "no-match", tiedTemplateNames: [] });
        continue;
      }

      const tied = matches.filter((match) => {
        return (
          match.matchRatio === best.matchRatio &&
          match.matchedFileCount === best.matchedFileCount
        );
      });

      if (tied.length > 1 && best.matchRatio < COMPLETE_MATCH_RATIO) {
        unmatched.push({
          instance,
          reason: "ambiguous",
          tiedTemplateNames: tied.map((match) => match.template.name),
        });
        continue;
      }

      matched.push(
        ...tied.map((match) => {
          return {
            instance,
            matchedFileCount: match.matchedFileCount,
            placeholderValues: match.placeholderValues,
            substitutions: match.substitutions,
            template: match.template,
          };
        }),
      );
    }

    return { matched, unmatched };
  }

  /**
   * Weighs every template that shares at least one file with the instance,
   * best-first.
   *
   * Public because a caller may need the ranking itself and not just the
   * verdict: nothing records which template an instance came from, so an
   * ambiguous or unmatched outcome is only explainable by showing what was
   * weighed and how well each template fitted.
   */
  public matchTemplates(args: {
    instance: Instance;
    substitutions: Substitutions;
    templates: TemplateDefinition[];
  }): TemplateMatch[] {
    return args.templates
      .map((template) => {
        const filled = this.fillPlaceholders({
          substitutions: args.substitutions,
          template,
        });
        const matchedFileCount =
          this.templateDiscoveryService.countMatchingFiles({
            fileScope: args.instance.fileScope,
            instancePath: args.instance.path,
            substitutions: filled.substitutions,
            template,
          });

        return {
          ...filled,
          matchedFileCount,
          matchRatio: matchedFileCount / template.filePaths.length,
          template,
        };
      })
      .filter((match) => {
        return (
          match.matchedFileCount > 0 && match.matchRatio > MINIMUM_MATCH_RATIO
        );
      })
      .toSorted((left, right) => this.compareMatches(left, right));
  }
}
