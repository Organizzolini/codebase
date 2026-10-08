import path from "node:path";

import {
  ConfigurationService as CodometerConfigurationService,
  CONFIGURATION_FILE_NAMES,
  DEFAULT_EXCLUDE_GLOBS,
} from "@codometer/configuration";
import { DiscoveryService } from "@codometer/measurement";
import { Injectable } from "@nestjs/common";

import { formatBytes, formatCount } from "../render/render.utilities";

import {
  ABSENT_LABEL,
  SIZE_METRIC_SUFFIX,
} from "./configuration-listing.constants";

import type {
  ConfiguredDirectory,
  ConfiguredLimitRow,
  ConfiguredTree,
  DescribeConfigurationsArguments,
  DiscoveredConfigurationFiles,
  WalkExclusions,
} from "./configuration-listing.types";

/**
 * Finds every codometer configuration in a tree and says what each one holds.
 *
 * Answers the question a repository gains once its limits stop living in one
 * table: where is everything configured, and what does it add up to. It reads
 * configuration and never measures anything, so it needs no build and runs in
 * milliseconds — and no single unreadable file takes the listing down, because
 * every failure is carried back on the result rather than thrown.
 */
@Injectable()
export class ConfigurationListingService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: CodometerConfigurationService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  // 🔐 Private Fields

  /** Every name a configuration file may be written under, as a set. */
  private readonly configurationFileNames = new Set<string>(
    CONFIGURATION_FILE_NAMES,
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Resolves one configuration file, reporting rather than throwing on failure.
   *
   * A file named like a configuration is not always one that loads: a
   * generator template carries placeholders in its own path, and a
   * work-in-progress file may not parse. One such file must not take the
   * listing down with it, because the listing is most wanted precisely when
   * something is wrong. The failure is carried on the entry so the reader sees
   * which file could not be read instead of a shorter list than the tree holds.
   */
  private async describeConfiguration(args: {
    directory: string;
    file: string;
    workingDirectory: string;
  }): Promise<ConfiguredDirectory> {
    try {
      const { configuration } =
        await this.configurationService.loadConfigurationFile({
          configurationPath: path.resolve(args.workingDirectory, args.file),
          searchDirectory: path.resolve(args.workingDirectory, args.directory),
        });

      return {
        configuration,
        directory: args.directory,
        error: undefined,
        path: args.file,
      };
    } catch (error) {
      return {
        configuration: undefined,
        directory: args.directory,
        error: error instanceof Error ? error.message : String(error),
        path: args.file,
      };
    }
  }

  /**
   * Renders a limit's value with the unit its metric implies.
   *
   * A resolved limit carries a bare number, so `256000` alone cannot say
   * whether it gates bytes or files. Only a size analysis produces a `.size`
   * metric, which is what makes the suffix a sound test.
   */
  private formatLimitValue(metric: string, value: number): string {
    return metric.endsWith(SIZE_METRIC_SUFFIX)
      ? formatBytes(value)
      : formatCount(value);
  }

  /**
   * Resolves the exclusions the walk uses, reporting rather than throwing.
   *
   * The walk root is not guaranteed to have a configuration answering for it:
   * a workspace states its `format` once in a shared object that each project
   * spreads, so the root itself may carry no configuration file at all and the
   * upward search then finds nothing to resolve. A workspace in that shape
   * names its own file with `--config`; one that does neither must not take
   * the listing down — the listing is most wanted precisely when the
   * configuration is in a state somebody is trying to understand — so the
   * built-in exclusions stand in and the failure is carried back to be
   * reported and to fail the run's exit code.
   */
  private async resolveWalkExclusions(
    args: DescribeConfigurationsArguments,
  ): Promise<WalkExclusions> {
    try {
      const { configuration } =
        await this.configurationService.loadConfigurationFile({
          configurationPath: args.configurationPath,
          searchDirectory: args.workingDirectory,
        });

      return {
        error: undefined,
        exclude: configuration.exclude,
        excludeFrom: configuration.excludeFrom,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        exclude: [...DEFAULT_EXCLUDE_GLOBS],
        excludeFrom: [],
      };
    }
  }

  // 🌎 Public Methods

  /**
   * Resolves the configuration each file in a tree answers with.
   *
   * Every file is resolved for **its own directory** rather than for the walk
   * root, which is what makes the result match what a per-project run of
   * codometer actually sees: every configuration file is resolved against the
   * directory it sits in, so resolving one anywhere else would report
   * something no run would ever use.
   */
  public async describeConfigurations(
    args: DescribeConfigurationsArguments,
  ): Promise<ConfiguredTree> {
    const { files, rootError } = await this.findConfigurationFiles(args);
    const described: ConfiguredDirectory[] = [];

    for (const file of files) {
      described.push(
        await this.describeConfiguration({
          directory: path.dirname(file),
          file,
          workingDirectory: args.workingDirectory,
        }),
      );
    }

    return { described, rootError };
  }

  /**
   * Finds every configuration file beneath a directory.
   *
   * Walks with the same gitignore-aware discovery a measurement uses, so a
   * configuration inside `node_modules` or a build directory is never picked
   * up, and one inside a folder the repository ignores is never reported as
   * something the repository configures.
   *
   * The exclusions come from whatever configuration answers for the walk root,
   * because that is what says which files this repository considers its own —
   * walking without them would list every configuration in a vendored
   * dependency or a generator template. A root nothing answers for falls back
   * to the built-in exclusions and reports itself instead of failing.
   */
  public async findConfigurationFiles(
    args: DescribeConfigurationsArguments,
  ): Promise<DiscoveredConfigurationFiles> {
    const exclusions = await this.resolveWalkExclusions(args);
    const { files } = this.discoveryService.discoverFiles({
      exclude: exclusions.exclude,
      excludeFrom: exclusions.excludeFrom,
      workingDirectory: args.workingDirectory,
    });

    return {
      files: files
        .filter((file) => this.configurationFileNames.has(path.basename(file)))
        .toSorted((first, second) => first.localeCompare(second)),
      rootError: exclusions.error,
    };
  }

  /** Flattens every configured limit into one row per limit, in walk order. */
  public toLimitRows(
    described: readonly ConfiguredDirectory[],
  ): ConfiguredLimitRow[] {
    return described.flatMap((entry) =>
      (entry.configuration?.limits ?? []).map((limit) => ({
        directory: entry.directory,
        label: limit.label ?? ABSENT_LABEL,
        metric: limit.metric,
        path: entry.path,
        severity: limit.severity,
        value: this.formatLimitValue(limit.metric, limit.value),
      })),
    );
  }
}
