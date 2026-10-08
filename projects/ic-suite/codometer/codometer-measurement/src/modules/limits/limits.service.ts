import { Injectable } from "@nestjs/common";

import {
  EmptyTargetError,
  METRIC_PATH_SEPARATOR,
  UnboundMetricError,
} from "./limits.constants";

import type {
  BindMetricArguments,
  EvaluatedLimit,
  EvaluateLimitsArguments,
  LimitFailure,
  LimitsEvaluation,
  MetricBinding,
  ResolveMetricArguments,
  TargetMetricIndex,
} from "./limits.types";

/**
 * Holds measured metrics to the limits declared against them.
 *
 * Every metric is addressable, whichever analysis produced it, by a dotted
 * path of target name and metric path. Nothing here decides what a breach
 * costs: it reports which limits were exceeded and how badly, and what that is
 * worth is the caller's to say.
 */
@Injectable()
export class LimitsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Binds one metric path within one target, if that target measured it. */
  private bind(args: BindMetricArguments): MetricBinding | undefined {
    if (args.index.ambiguous.has(args.metricPath)) {
      throw new UnboundMetricError(
        args.path,
        `the "${args.target}" target measured more than one metric called "${args.metricPath}". Two configured statistics sharing a label is how that happens — rename one of them.`,
      );
    }

    const measured = args.index.metrics.get(args.metricPath);

    return measured === undefined
      ? undefined
      : {
          files: args.index.files,
          measured,
          metric: args.metricPath,
          target: args.target,
        };
  }

  /** Names one binding the way an error message reads it out. */
  private describeBinding(binding: MetricBinding): string {
    return `the "${binding.target}" target's "${binding.metric}" metric`;
  }

  /** Reads whatever a failed binding threw as the sentence a report prints. */
  private describeFailure(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /** Names every measured target, for an error that has to list them. */
  private describeTargets(
    indexes: ReadonlyMap<string, TargetMetricIndex>,
  ): string {
    return [...indexes.keys()].map((target) => `"${target}"`).join(", ");
  }

  /**
   * Every metric a written path could mean.
   *
   * Each target is asked whether the path starts with its name, rather than
   * the path being split at its first dot: a target's name may hold a dot of
   * its own, and so may the metric path that follows it. Whatever the shapes
   * involved, every reading is collected and none of them is preferred.
   */
  private findCandidates(args: ResolveMetricArguments): MetricBinding[] {
    const candidates: MetricBinding[] = [];

    for (const [target, index] of args.indexes) {
      const prefix = `${target}${METRIC_PATH_SEPARATOR}`;

      if (!args.path.startsWith(prefix)) {
        continue;
      }

      const candidate = this.bind({
        index,
        metricPath: args.path.slice(prefix.length),
        path: args.path,
        target,
      });

      if (candidate !== undefined) {
        candidates.push(candidate);
      }
    }

    const unqualified = this.findDefaultCandidate(args);

    if (unqualified !== undefined) {
      candidates.push(unqualified);
    }

    return candidates;
  }

  /**
   * What the path would mean read as the default target's, if one is set.
   *
   * A default target that was never measured is refused rather than ignored:
   * ignoring it would turn every unqualified path in the configuration into an
   * unresolvable one, and report the paths instead of the reason.
   */
  private findDefaultCandidate(
    args: ResolveMetricArguments,
  ): MetricBinding | undefined {
    if (args.defaultInput === undefined) {
      return undefined;
    }

    const index = args.indexes.get(args.defaultInput);

    if (index === undefined) {
      throw new UnboundMetricError(
        args.path,
        `the configured default input "${args.defaultInput}" was never measured. Measured targets: ${this.describeTargets(args.indexes)}.`,
      );
    }

    return this.bind({
      index,
      metricPath: args.path,
      path: args.path,
      target: args.defaultInput,
    });
  }

  /**
   * Points one written path at exactly one measured metric.
   *
   * Ambiguity is refused rather than settled by a rule about which reading
   * wins. Any such rule would be invisible in the configuration file, and a
   * limit holding a metric nobody meant to limit reads exactly like one that
   * works.
   */
  private resolve(args: ResolveMetricArguments): MetricBinding {
    const candidates = this.findCandidates(args);
    const [binding] = candidates;

    if (binding === undefined) {
      throw new UnboundMetricError(
        args.path,
        `nothing measured answers to it. Measured targets: ${this.describeTargets(args.indexes)}. Write the target's name in front of the metric path, or configure a default input.`,
      );
    }

    if (candidates.length > 1) {
      const readings = candidates
        .map((candidate) => this.describeBinding(candidate))
        .join(", or ");

      throw new UnboundMetricError(
        args.path,
        `it could be ${readings}. Write the target's name in front of the one it means.`,
      );
    }

    // Checked here rather than per target, because an empty match is only a
    // failure where a limit asserted the files exist.
    if (binding.files === 0) {
      throw new EmptyTargetError(binding.target, binding.metric);
    }

    return binding;
  }

  // 🌎 Public Methods

  /**
   * Holds every declared limit against the metric it addresses.
   *
   * Returns what each limit found rather than a verdict. Severity is carried
   * through untouched: whether a breach stops the run is a decision about the
   * run, not about the measurement.
   *
   * A limit that binds to nothing joins `failures` and the rest are evaluated
   * anyway, so one run names every path in a configuration that binds to
   * nothing instead of the first one and nothing after it.
   */
  evaluate(args: EvaluateLimitsArguments): LimitsEvaluation {
    const failures: LimitFailure[] = [];
    const limits: EvaluatedLimit[] = [];

    for (const limit of args.configuration.limits) {
      try {
        const binding = this.resolve({
          defaultInput: args.configuration.defaultInput,
          indexes: args.indexes,
          path: limit.metric,
        });

        limits.push({
          breached: binding.measured > limit.value,
          label: limit.label,
          limit: limit.value,
          measured: binding.measured,
          metric: binding.metric,
          severity: limit.severity,
          target: binding.target,
        });
      } catch (error: unknown) {
        failures.push({
          metric: limit.metric,
          reason: this.describeFailure(error),
        });
      }
    }

    return { failures, limits };
  }
}
