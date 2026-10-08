import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  DETAIL_INDENT,
  ENTRY_INDENT,
  INSTANCES_HEADING,
  PAIRING_INDENT,
  PERCENT_SCALE,
  TEMPLATE_LABEL,
  TEMPLATES_HEADING,
} from "./inventory.constants";

import type {
  InventoriedInstance,
  InventoriedPairing,
  InventoriedTemplate,
} from "@conformetry/core";

/**
 * Renders the template and instance inventory as readable lines.
 *
 * The whole rendered form lives here rather than in the host that prints it,
 * because the indent ladder, the headings, and the percentage are one visual
 * grammar: split across two packages, half of it would drift from the other.
 * Hosts decide what to ask for and where the lines go; this decides how a
 * pairing reads.
 *
 * Paths arrive absolute, because that is the only stable way for discovery to
 * name an instance to another process. Shortening them is a host's concern —
 * only a host knows which directory a person is standing in — so it is offered
 * here as a separate step rather than folded into rendering.
 */
@Injectable()
export class InventoryService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Renders one pairing as an indented line beneath its entry. */
  private describePairing(pairing: InventoriedPairing): string {
    const counts = `${String(pairing.matchedFileCount)}/${String(pairing.templateFileCount)}`;

    return `${PAIRING_INDENT}${pairing.name} ${counts} files ${this.formatRatio(pairing.matchRatio)}`;
  }

  /**
   * Renders a file-overlap ratio as a whole percentage.
   *
   * Deliberately coarser than the score percentage reporting renders. A score
   * is read against a threshold, where a tenth of a percent decides whether an
   * instance passes; this is "how much of the template is here", scanned down
   * a list, where a decimal is noise.
   */
  private formatRatio(matchRatio: number): string {
    return `${String(Math.round(matchRatio * PERCENT_SCALE))}%`;
  }

  /** Shortens an absolute path against the directory a host was run in. */
  private shortenPath(args: {
    absolutePath: string;
    workingDirectory: string;
  }): string {
    return path.relative(args.workingDirectory, args.absolutePath);
  }

  // 🌎 Public Methods

  /** Renders every instance found, with the templates that explain each. */
  public describeInstances(instances: InventoriedInstance[]): string[] {
    return instances.flatMap((instance) => {
      return [
        `${ENTRY_INDENT}${instance.path}`,
        `${DETAIL_INDENT}${TEMPLATES_HEADING}`,
        ...instance.templates.map((template) => this.describePairing(template)),
      ];
    });
  }

  /**
   * Renders every declared template, with the instances each explains.
   *
   * The instances are listed only when the caller narrowed by path. A bare
   * listing is a registry — naming every instance of every template there
   * would bury the handful somebody actually asked about.
   */
  public describeTemplates(args: {
    showInstances: boolean;
    templates: InventoriedTemplate[];
  }): string[] {
    return args.templates.flatMap((template) => {
      const lines = [`${ENTRY_INDENT}${template.name}`];

      if (template.description !== "") {
        lines.push(`${DETAIL_INDENT}${template.description}`);
      }
      lines.push(`${DETAIL_INDENT}${TEMPLATE_LABEL}${template.templatePath}`);

      if (args.showInstances && template.instances.length > 0) {
        lines.push(
          `${DETAIL_INDENT}${INSTANCES_HEADING}`,
          ...template.instances.map((instance) =>
            this.describePairing(instance),
          ),
        );
      }

      return lines;
    });
  }

  /** Shortens the path naming each instance found. */
  public shortenInstancePaths(args: {
    instances: InventoriedInstance[];
    workingDirectory: string;
  }): InventoriedInstance[] {
    return args.instances.map((instance) => {
      return {
        ...instance,
        path: this.shortenPath({
          absolutePath: instance.path,
          workingDirectory: args.workingDirectory,
        }),
      };
    });
  }

  /** Shortens the path naming each instance a template explains. */
  public shortenTemplatePairings(args: {
    templates: InventoriedTemplate[];
    workingDirectory: string;
  }): InventoriedTemplate[] {
    return args.templates.map((template) => {
      return {
        ...template,
        instances: template.instances.map((instance) => {
          return {
            ...instance,
            name: this.shortenPath({
              absolutePath: instance.name,
              workingDirectory: args.workingDirectory,
            }),
          };
        }),
      };
    });
  }
}
