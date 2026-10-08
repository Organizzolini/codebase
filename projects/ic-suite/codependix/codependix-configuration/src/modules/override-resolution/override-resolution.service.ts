import { Injectable } from "@nestjs/common";

import { InputError } from "../input/input.constants";

import { buildUndeclaredOverrideMessage } from "./override-resolution.constants";

import type { ResolvedCodependixConfiguration } from "../configuration/configuration.types";
import type { ApplyOverridesArguments } from "./override-resolution.types";

/**
 * Applies strict, per-field CLI overrides to an already-resolved
 * configuration.
 *
 * Mirrors `@callidescope/configuration`'s `FlagResolutionService` philosophy
 * exactly: a flag may override a value the configuration already declares,
 * and is refused when the configuration never declared that field at all.
 * Kept apart from `ConfigurationService` so the resolution logic — and the
 * file-length budget it would otherwise share with loading, boundary
 * defaulting, and per-project resolution — is stated and tested once, on its
 * own.
 */
@Injectable()
export class OverrideResolutionService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Applies one list override, refusing it when the author never declared
   * the field it names.
   *
   * Checked against `authored` — the configuration exactly as parsed, before
   * `include`/`exclude` are defaulted — rather than against the resolved
   * value: `ConfigurationService.resolveConfiguration` fills in
   * `DEFAULT_INCLUDE_GLOBS`/`[]` for a field the author never wrote, so the
   * resolved value is never itself `undefined`. Checking there would make
   * every override legal regardless of what the configuration actually
   * declared, which is the opposite of the precedence rule this mirrors.
   *
   * An empty override list is read the same as no override at all.
   */
  private resolveOverride(args: {
    authored: string[] | undefined;
    configured: string[];
    field: string;
    flag: string;
    override: string[] | undefined;
  }): string[] {
    const { authored, configured, field, flag, override } = args;

    if (override === undefined || override.length === 0) {
      return configured;
    }

    if (authored === undefined) {
      throw new InputError(buildUndeclaredOverrideMessage({ field, flag }));
    }

    return [...override];
  }

  // 🌎 Public Methods

  /**
   * Applies `--include`/`--exclude` on top of an already-resolved
   * configuration.
   */
  public applyOverrides(
    args: ApplyOverridesArguments,
  ): ResolvedCodependixConfiguration {
    const { authored, overrides, resolved } = args;

    if (overrides === undefined) {
      return resolved;
    }

    return {
      ...resolved,
      exclude: this.resolveOverride({
        authored: authored.exclude,
        configured: resolved.exclude,
        field: "exclude",
        flag: "--exclude",
        override: overrides.exclude,
      }),
      include: this.resolveOverride({
        authored: authored.include,
        configured: resolved.include,
        field: "include",
        flag: "--include",
        override: overrides.include,
      }),
    };
  }
}
