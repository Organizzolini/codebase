import { CALLIDESCOPE_OUTPUT_FORMATS } from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";

import {
  CALLIDESCOPE_NX_PLUGIN_NAME,
  DEFAULT_BREADTH_TARGET_NAME,
  DEFAULT_CONFIGURATION_PATHS,
  DEFAULT_DEPTH_TARGET_NAME,
  DEFAULT_GATE_TARGET_NAME,
  DEFAULT_TRACE_TARGET_NAME,
} from "./options.constants";

import type { CallidescopePluginOptions } from "./options.types";
import type { CallidescopeOutputFormat } from "@callidescope/configuration";

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

  /** Reads one `nx.json` plugin entry, if it is this plugin's registration. */
  private readEntryConfigurationPath(entry: unknown): string | undefined {
    if (typeof entry !== "object" || entry === null) {
      return undefined;
    }

    const { options, plugin }: { options?: unknown; plugin?: unknown } = {
      ...entry,
    };

    if (plugin !== CALLIDESCOPE_NX_PLUGIN_NAME) {
      return undefined;
    }

    if (typeof options !== "object" || options === null) {
      return undefined;
    }

    return this.readString({
      key: "configurationPath",
      options: { ...options },
    });
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
      const configurationPath = this.readEntryConfigurationPath(entry);

      if (configurationPath !== undefined) {
        return configurationPath;
      }
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
   * Narrows an untrusted output format to one callidescope renders.
   *
   * A target written by hand in a `project.json` bypasses the executor's
   * `schema.json` enum, so an unrecognized value falls back to whatever the
   * configuration chose rather than reaching the renderer.
   */
  public readFormat(value: unknown): CallidescopeOutputFormat | undefined {
    return CALLIDESCOPE_OUTPUT_FORMATS.find(
      (format): boolean => format === value,
    );
  }

  /**
   * Reads a list of strings out of an executor's options.
   *
   * Nx validates an option against its `schema.json` before the executor sees
   * it, but a target written by hand in a `project.json` reaches here
   * unchecked, so a non-array or a list holding non-strings is narrowed rather
   * than trusted. Entries are trimmed and the blanks dropped, so a trailing
   * comma in `--projects a,b,` names two projects rather than three.
   */
  public readStringList(value: unknown): string[] {
    if (!this.isUnknownArray(value)) {
      return typeof value === "string" ? this.readStringList([value]) : [];
    }

    return value
      .filter((entry): entry is string => typeof entry === "string")
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
  }

  /**
   * Resolves the configuration path a workspace means, without assuming one.
   *
   * Nx passes plugin options to `createNodes` and to executors, but not to
   * anything run outside Nx, so a caller that has a filesystem resolves the
   * path itself rather than assuming a workspace keeps its configuration at
   * the root. `exists` is supplied by the caller because the callers do not
   * agree on what a filesystem is.
   */
  public resolveConfigurationPath(args: {
    exists: (candidatePath: string) => boolean;
    nxConfiguration: unknown;
  }): string {
    return (
      this.readRegisteredConfigurationPath(args.nxConfiguration) ??
      DEFAULT_CONFIGURATION_PATHS.find((candidatePath) =>
        args.exists(candidatePath),
      ) ??
      DEFAULT_CONFIGURATION_PATHS[0]
    );
  }

  /** Resolves the effective plugin options from an untrusted value. */
  public resolvePluginOptions(options: unknown): CallidescopePluginOptions {
    const record: Record<string, unknown> =
      typeof options === "object" && options !== null ? { ...options } : {};

    return {
      breadthTargetName:
        this.readString({ key: "breadthTargetName", options: record }) ??
        DEFAULT_BREADTH_TARGET_NAME,
      configurationPath:
        this.readString({ key: "configurationPath", options: record }) ??
        DEFAULT_CONFIGURATION_PATHS[0],
      depthTargetName:
        this.readString({ key: "depthTargetName", options: record }) ??
        DEFAULT_DEPTH_TARGET_NAME,
      gateTargetName:
        this.readString({ key: "gateTargetName", options: record }) ??
        DEFAULT_GATE_TARGET_NAME,
      traceTargetName:
        this.readString({ key: "traceTargetName", options: record }) ??
        DEFAULT_TRACE_TARGET_NAME,
    };
  }
}
