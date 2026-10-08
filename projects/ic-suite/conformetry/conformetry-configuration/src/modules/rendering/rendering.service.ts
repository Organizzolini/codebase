import { Injectable } from "@nestjs/common";
import lodash from "lodash";
import mustache from "mustache";

import {
  MissingSubstitutionError,
  MUSTACHE_RENDER_OPTIONS,
} from "./rendering.constants";

import type { Substitutions } from "./rendering.types";
import type { TemplateSpans } from "mustache";

/**
 * Renders conformetry template placeholders.
 *
 * This is the single owner of template rendering across the workspace.
 * Generation renders templates to create files; validation renders the same
 * templates to compare them against existing files. Both must substitute
 * identically or validation would flag files the generator itself produced,
 * so neither reimplements this.
 */
@Injectable()
export class RenderingService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Refuses to render a template asking for a value nobody supplied. */
  private assertEverySubstitutionSupplied(args: {
    subject: string;
    substitutions: Substitutions;
    template: string;
  }): void {
    const placeholders = this.collectInterpolatedNames(args.template).filter(
      (name) => !Object.hasOwn(args.substitutions, name),
    );

    if (placeholders.length > 0) {
      throw new MissingSubstitutionError({
        placeholders,
        subject: args.subject,
      });
    }
  }

  // 🌎 Public Methods

  /**
   * Derives the case variants every template can reference from one name.
   *
   * Callers merge their own inputs over this result, so an explicit input of
   * the same key always wins over the derived variant.
   */
  public buildNameSubstitutions(name: string): Substitutions {
    const camelCaseName = lodash.camelCase(name);

    return {
      nameCamelCase: camelCaseName,
      nameKebabCase: lodash.kebabCase(name),
      namePascalCase: lodash.upperFirst(camelCaseName),
      nameSnakeCase: lodash.snakeCase(name),
    };
  }

  /**
   * Every placeholder a template interpolates, deduplicated.
   *
   * Mustache's own parser reads them, so an interpolation is told from a
   * comment, a partial, and a delimiter change the way mustache tells them.
   * Section names are skipped and their bodies still walked — `{{#field}}` and
   * `{{^field}}` are conditionals, so absence is an answer there — as is the
   * implicit iterator `{{.}}`, which names no field.
   */
  public collectInterpolatedNames(template: string): string[] {
    const names = new Set<string>();
    const walk = (spans: TemplateSpans): void => {
      for (const span of spans) {
        // A span is [type, value, start, end, children?]; indexed rather than
        // destructured because the offsets between are not needed.
        const type = span[0];
        const value = span[1];
        const children = span[4];

        if ((type === "name" || type === "&") && value !== ".") {
          names.add(value);
        }

        if (Array.isArray(children)) {
          walk(children);
        }
      }
    };

    walk(mustache.parse(template));

    return [...names];
  }

  /**
   * Renders template contents with mustache.
   *
   * Full mustache is available — sections, inverted sections, partials — with
   * HTML escaping disabled so substituted values cannot corrupt source code.
   *
   * An interpolated placeholder nobody supplied raises
   * `MissingSubstitutionError`. `subject` is what that error names, so pass
   * the template's path when there is one.
   */
  public renderContent(args: {
    subject?: string;
    substitutions: Substitutions;
    templateContent: string;
  }): string {
    this.assertEverySubstitutionSupplied({
      subject: args.subject ?? "a template file",
      substitutions: args.substitutions,
      template: args.templateContent,
    });

    return mustache.render(
      args.templateContent,
      args.substitutions,
      {},
      MUSTACHE_RENDER_OPTIONS,
    );
  }

  /**
   * Renders a template path with mustache, the same way contents are rendered.
   *
   * Paths once used a `__field__` syntax of their own, on the assumption that
   * braces were not portable across filesystems. They are — and the separate
   * syntax could not tell a placeholder from a Python dunder, so a template
   * shipping `__init__.py` depended on `init` never being a substitution.
   */
  public renderPath(args: {
    subject?: string;
    substitutions: Substitutions;
    templatePath: string;
  }): string {
    this.assertEverySubstitutionSupplied({
      subject: args.subject ?? args.templatePath,
      substitutions: args.substitutions,
      template: args.templatePath,
    });

    return mustache.render(
      args.templatePath,
      args.substitutions,
      {},
      MUSTACHE_RENDER_OPTIONS,
    );
  }
}
