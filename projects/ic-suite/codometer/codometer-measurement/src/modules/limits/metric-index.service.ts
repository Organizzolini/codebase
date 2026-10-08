import { Injectable } from "@nestjs/common";

import {
  CUSTOM_METRIC_PREFIX,
  FILES_METRIC_PATH,
  METRIC_PATH_SEPARATOR,
  SIZE_METRIC_PATH,
} from "./limits.constants";

import type {
  AddMetricArguments,
  DuplicateTargetFinding,
  MeasuredTarget,
  MetricIndexResult,
  TargetMetricIndex,
} from "./limits.types";
import type { CodeStatisticsResult } from "@codometer/core";

/**
 * Makes every measured number addressable by a dotted path.
 *
 * The same index answers two questions that used to be one layer's private
 * business: which metric a limit is written against, and which metrics the
 * report has to list. Both need every number a target measured, named the same
 * way, so the naming lives here rather than in either caller.
 */
@Injectable()
export class MetricIndexService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Records one metric, or marks its path as answered by more than one.
   *
   * Two counters sharing a path is a configuration mistake rather than a
   * measurement one — two statistics with the same label — and it is caught
   * here so that a limit addressing that path is refused instead of being
   * given whichever counter was indexed first.
   */
  private addMetric(args: AddMetricArguments): void {
    if (args.index.metrics.has(args.metricPath)) {
      args.index.ambiguous.add(args.metricPath);
      return;
    }

    args.index.metrics.set(args.metricPath, args.value);

    if (args.instances !== undefined) {
      args.index.instances.set(args.metricPath, args.instances);
    }
  }

  /**
   * Indexes every metric one target measured, by its path within that target.
   *
   * An analysis the target never ran contributes nothing, so a limit written
   * against it is refused rather than being compared against a zero the target
   * never reported.
   */
  private buildTargetIndex(target: MeasuredTarget): TargetMetricIndex {
    const index: TargetMetricIndex = {
      ambiguous: new Set(),
      files: target.files,
      instances: new Map(),
      metrics: new Map(),
    };

    this.addMetric({
      index,
      metricPath: FILES_METRIC_PATH,
      value: target.files,
    });

    if (target.size !== undefined) {
      this.addMetric({
        index,
        metricPath: SIZE_METRIC_PATH,
        value: target.size.bytes,
      });
    }

    if (target.language !== undefined) {
      this.indexLanguage(index, target.language);
    }

    return index;
  }

  /**
   * Explains a name two measured targets both answered to.
   *
   * Written where the collision is found rather than raised as an error: the
   * run carries on with the first target of that name, and this is what the
   * report says about the one it had to drop.
   */
  private describeDuplicate(target: string): DuplicateTargetFinding {
    return {
      reason: `Two measured targets are called "${target}". A limit addresses its metric by target name, so the name has to belong to one of them; the second was dropped.`,
      target,
    };
  }

  /** Indexes a group of counters, descending into the nested ones. */
  private indexCounters(
    index: TargetMetricIndex,
    counters: Record<string, unknown>,
    prefix: string,
  ): void {
    for (const [name, value] of Object.entries(counters)) {
      const metricPath =
        prefix === "" ? name : `${prefix}${METRIC_PATH_SEPARATOR}${name}`;

      if (typeof value === "number") {
        this.addMetric({ index, metricPath, value });
      } else if (this.isCounterGroup(value)) {
        this.indexCounters(index, value, metricPath);
      }
    }
  }

  /**
   * Indexes everything language analysis counted.
   *
   * Configured counters are indexed under a prefix rather than beside the
   * built-in ones, so a counter labelled `files` cannot take the path the file
   * count already answers to.
   */
  private indexLanguage(
    index: TargetMetricIndex,
    language: CodeStatisticsResult,
  ): void {
    const { custom, ...groups } = language;

    this.indexCounters(index, groups, "");

    for (const statistic of custom) {
      this.addMetric({
        index,
        instances: statistic.instances,
        metricPath: `${CUSTOM_METRIC_PREFIX}${METRIC_PATH_SEPARATOR}${statistic.label}`,
        value: statistic.count,
      });
    }
  }

  /** Whether a statistics entry holds counters of its own. */
  private isCounterGroup(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // 🌎 Public Methods

  /**
   * Indexes every measured target, by name.
   *
   * A repeated name is collected rather than thrown, so a run reports every
   * naming collision it found instead of the first one. The later target is
   * dropped: a metric is addressed by its target's name, so a name answering
   * to two targets can address neither.
   */
  index(targets: readonly MeasuredTarget[]): MetricIndexResult {
    const duplicates: DuplicateTargetFinding[] = [];
    const indexes = new Map<string, TargetMetricIndex>();

    for (const target of targets) {
      if (indexes.has(target.name)) {
        duplicates.push(this.describeDuplicate(target.name));
        continue;
      }

      indexes.set(target.name, this.buildTargetIndex(target));
    }

    return { duplicates, indexes };
  }
}
