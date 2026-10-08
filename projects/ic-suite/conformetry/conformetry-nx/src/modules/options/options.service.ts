import { Injectable } from "@nestjs/common";

import {
  CONFORMETRY_NX_PLUGIN_NAME,
  DEFAULT_CONFIGURATION_PATHS,
  DEFAULT_VALIDATE_TARGET_NAME,
  PLUGIN_OPTION_NAMES,
} from "./options.constants";

import type { ConformetryPluginOptions } from "./options.types";

/**
 * Narrows the untyped options object Nx hands a plugin.
 *
 * Nx passes whatever the consumer wrote in `nx.json` with no validation, so
 * every field is checked before use rather than cast. A bad value falls back
 * to its default: a typo in a target name should not stop the project graph
 * from being built.
 */
@Injectable()
export class OptionsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows an untrusted value to an array without widening it to `any`. */
  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /** Reads this plugin's `configurationPath` out of an `nx.json`, if it names one. */
  private readRegisteredConfigurationPath(
    nxConfiguration: unknown,
  ): string | undefined {
    if (typeof nxConfiguration !== "object" || nxConfiguration === null) {
      return undefined;
    }

    const { plugins }: { plugins?: unknown } = { ...nxConfiguration };

    if (!this.isUnknownArray(plugins)) {
      return undefined;
    }

    for (const entry of plugins) {
      if (typeof entry !== "object" || entry === null) {
        continue;
      }

      const { options, plugin }: { options?: unknown; plugin?: unknown } = {
        ...entry,
      };

      if (plugin !== CONFORMETRY_NX_PLUGIN_NAME) {
        continue;
      }

      return typeof options === "object" && options !== null
        ? this.readString({ key: "configurationPath", options: { ...options } })
        : undefined;
    }

    return undefined;
  }

  /** Reads a string field from an untrusted record, or `undefined`. */
  private readString(args: {
    key: string;
    options: Record<string, unknown>;
  }): string | undefined {
    const value = args.options[args.key];

    return typeof value === "string" && value !== "" ? value : undefined;
  }

  // 🌎 Public Methods

  /**
   * Resolves the configuration path a workspace means, without assuming one.
   *
   * Nx passes plugin options to `createNodes` and to executors, but not to a
   * global sync generator or to anything run outside Nx entirely, such as the
   * install-time bootstrap. Those read the registration themselves rather than
   * assuming a path, so a workspace that keeps its configuration somewhere
   * other than the root is not silently read from nothing.
   *
   * With no registration, the conventional root filenames are tried in order.
   * `exists` is supplied by the caller rather than reached for here, because
   * the callers do not agree on what a filesystem is: two of them read disk
   * and the sync generator reads an Nx `Tree`.
   */
  public resolveConfigurationPath(args: {
    exists: (candidatePath: string) => boolean;
    nxConfiguration: unknown;
  }): string {
    return (
      this.readRegisteredConfigurationPath(args.nxConfiguration) ??
      DEFAULT_CONFIGURATION_PATHS.find((candidatePath) => {
        return args.exists(candidatePath);
      }) ??
      DEFAULT_CONFIGURATION_PATHS[0]
    );
  }

  /**
   * Extracts the generator inputs from an Nx options object.
   *
   * Nx hands a generator every option the consumer passed, including the ones
   * that configure this plugin rather than the generator. Those are dropped so
   * a template placeholder is never accidentally filled with a config path,
   * and non-string values are dropped because substitutions are text.
   */
  public resolveGeneratorInputs(
    options: unknown,
  ): Record<string, string | undefined> {
    if (typeof options !== "object" || options === null) {
      return {};
    }

    const inputs: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries({ ...options })) {
      if (PLUGIN_OPTION_NAMES.includes(key) || typeof value !== "string") {
        continue;
      }

      inputs[key] = value;
    }

    return inputs;
  }

  /**
   * Resolves the effective plugin options from an untrusted value.
   *
   * Falls back to the most conventional configuration filename rather than
   * discovering which one is present, which needs a filesystem; callers that
   * have one resolve the path with `resolveConfigurationPath` first and pass
   * the result in.
   */
  public resolvePluginOptions(options: unknown): ConformetryPluginOptions {
    if (typeof options !== "object" || options === null) {
      return {
        configurationPath: DEFAULT_CONFIGURATION_PATHS[0],
        validateTargetName: DEFAULT_VALIDATE_TARGET_NAME,
      };
    }

    const record: Record<string, unknown> = { ...options };

    return {
      configurationPath:
        this.readString({ key: "configurationPath", options: record }) ??
        DEFAULT_CONFIGURATION_PATHS[0],
      validateTargetName:
        this.readString({ key: "validateTargetName", options: record }) ??
        DEFAULT_VALIDATE_TARGET_NAME,
    };
  }
}
