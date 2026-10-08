import {
  InvalidConfigurationError,
  InvalidLimitValueError,
} from "@codometer/core";
import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { codometerConfigurationSchema } from "./configuration-schema.constants";
import {
  DEFAULT_CODEBASE_INPUT,
  DEFAULT_CUSTOM_STATISTIC_COLORS,
  DEFAULT_CUSTOM_STATISTIC_GROUP,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_INPUT_COMPRESSION,
  DEFAULT_INPUT_DIRECTORY,
  DEFAULT_INPUT_NAME,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_LIMIT_SEVERITY,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
  LIMIT_UNIT_MULTIPLIERS,
  LIMIT_VALUE_PATTERN,
  NEGATION_PREFIX,
} from "./configuration.constants";

import type {
  CodometerConfiguration,
  CodometerCustomStatistic,
  CodometerInput,
  CodometerJsonOutput,
  CodometerLimit,
  CodometerMarkdownOutput,
  CodometerOutput,
} from "./configuration.types";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  ResolvedCodometerInput,
  ResolvedCodometerJsonOutput,
  ResolvedCodometerLimit,
  ResolvedCodometerMarkdownOutput,
  ResolvedCodometerOutput,
} from "./resolved.types";
import type { CodometerStatisticGroup } from "@codometer/core";

/**
 * Fills a validated configuration in, field by field, with what it left out.
 *
 * Not exported from this package. The configuration layer has exactly one
 * public entry point, and this is the half of it that turns a file's contents
 * into the resolved object every analyzer reads — held apart from
 * `ConfigurationService` so that class states what the layer answers rather
 * than how each default is arrived at.
 */
@Injectable()
export class ConfigurationResolverService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Validates a configuration object, refusing it in prose rather than in JSON.
   *
   * Every load goes through here — a file's contents and the empty object a
   * directory with no configuration file stands in with alike — so the two
   * fail identically and a reader gets the same sentence either way.
   */
  private parseConfigurationInternal(
    configuration: unknown,
  ): CodometerConfiguration {
    const parsed = codometerConfigurationSchema.safeParse(configuration);

    if (!parsed.success) {
      throw new InvalidConfigurationError(z.prettifyError(parsed.error));
    }

    return parsed.data;
  }

  /**
   * Reads a limit's value, in decimal units when it was written as a string.
   *
   * Everything unreadable is refused: a negative number, a unit missing its
   * `b`, a word, an empty string. The tool this replaces coerced an unreadable
   * limit to nothing and then failed every target holding a single byte.
   */
  private parseLimitValue(limit: CodometerLimit): number {
    if (typeof limit.value !== "number") {
      return this.parseLimitValueText(limit.metric, limit.value);
    }

    if (!Number.isFinite(limit.value) || limit.value < 0) {
      throw new InvalidLimitValueError(limit.metric, String(limit.value));
    }

    return limit.value;
  }

  /**
   * Reads a limit written as a string, unit and all.
   *
   * A unit multiplies and then rounds: `"1.5 KB"` is 1500, and the rounding is
   * what keeps `"0.1 KB"` from arriving as the 100.00000000000001 floating
   * point makes of it. A string carrying no unit at all is the plain number,
   * which is what a limit on a count of interfaces or files is written as.
   */
  private parseLimitValueText(metric: string, text: string): number {
    const [, amount, unit] = LIMIT_VALUE_PATTERN.exec(text.trim()) ?? [];

    if (amount === undefined || unit === undefined) {
      throw new InvalidLimitValueError(metric, text);
    }

    if (unit === "") {
      return Number(amount);
    }

    const multiplier = LIMIT_UNIT_MULTIPLIERS.get(unit.toLowerCase());

    if (multiplier === undefined) {
      throw new InvalidLimitValueError(metric, text);
    }

    return Math.round(Number(amount) * multiplier);
  }

  /**
   * Gives every configured counter a color and a group, and its `comment`
   * selector a severity.
   *
   * Colors are handed out by position within a group rather than within the
   * whole list, so adding a counter to one group does not recolor the badges
   * of another — which would rewrite a report that had not otherwise changed.
   * A `comment` selector's own defaulting is inlined here rather than given
   * its own method: this list already runs one call deep inside
   * `resolveConfiguration`, and a further call would push the whole chain
   * past what this package's callidescope gate allows.
   *
   * Runs once, over the top-level `custom` declaration — never per output.
   * An output only selects labels back out of what this resolves, so a
   * counter is never resolved twice just because two outputs both render it.
   */
  private resolveCustomStatistics(
    statistics: CodometerCustomStatistic[] | undefined,
  ): ResolvedCodometerCustomStatistic[] {
    const positionsByGroup = new Map<CodometerStatisticGroup, number>();

    return (statistics ?? []).map((statistic) => {
      const group = statistic.group ?? DEFAULT_CUSTOM_STATISTIC_GROUP;
      const position = positionsByGroup.get(group) ?? 0;
      positionsByGroup.set(group, position + 1);
      const { comment } = statistic;

      return {
        color:
          statistic.color ??
          DEFAULT_CUSTOM_STATISTIC_COLORS[
            position % DEFAULT_CUSTOM_STATISTIC_COLORS.length
          ] ??
          "7c3aed",
        comment:
          comment === undefined
            ? undefined
            : {
                kind: comment.kind,
                language: comment.language,
                maximumCharacters: comment.maximumCharacters,
                maximumLines: comment.maximumLines,
                maximumWords: comment.maximumWords,
                severity: comment.severity ?? DEFAULT_LIMIT_SEVERITY,
              },
        group,
        label: statistic.label,
        patterns: statistic.patterns ?? [],
        symbols: statistic.symbols,
      };
    });
  }

  /**
   * Fills in every input's compression and directory, and splits its globs
   * into what they add and what they remove.
   *
   * A `!` prefix in `include` is what the tool this replaced used to subtract
   * a file, and there it mattered where in the array it sat. Here the
   * negations join the exclude globs in a single set, so an input holds the
   * same files however its patterns are arranged.
   */
  private resolveInput(input: CodometerInput): ResolvedCodometerInput {
    return {
      analyses: [...input.analyses],
      compression: input.compression ?? DEFAULT_INPUT_COMPRESSION,
      directory: input.directory ?? DEFAULT_INPUT_DIRECTORY,
      exclude: [
        ...new Set([
          ...input.include
            .filter((pattern) => pattern.startsWith(NEGATION_PREFIX))
            .map((pattern) => pattern.slice(NEGATION_PREFIX.length)),
          ...(input.exclude ?? []),
        ]),
      ],
      include: input.include.filter(
        (pattern) => !pattern.startsWith(NEGATION_PREFIX),
      ),
      name: input.name,
    };
  }

  /**
   * Resolves every declared input, and the built-in `codebase` one.
   *
   * The built-in entry is prepended unless the configuration already declares
   * one by that name, which replaces it outright — the only way a
   * configuration reaches the built-in whole-tree scan under a compression or
   * a different set of analyses.
   */
  private resolveInputs(
    inputs: CodometerInput[] | undefined,
  ): ResolvedCodometerInput[] {
    const declared = inputs ?? [];
    const hasCodebaseInput = declared.some(
      (input) => input.name === DEFAULT_INPUT_NAME,
    );
    const effective = hasCodebaseInput
      ? declared
      : [DEFAULT_CODEBASE_INPUT, ...declared];

    return effective.map((input) => this.resolveInput(input));
  }

  /** Applies defaults to one JSON output destination. */
  private resolveJsonOutput(
    output: CodometerJsonOutput,
    customStatistics: readonly ResolvedCodometerCustomStatistic[],
  ): ResolvedCodometerJsonOutput {
    return {
      custom: this.selectCustomStatistics(output.custom, customStatistics),
      indentation: output.indentation ?? DEFAULT_JSON_INDENTATION,
      path: output.path,
      type: "json",
    };
  }

  /**
   * Gives every limit its severity and a value read as a number.
   *
   * Which metric a limit lands on is decided where the measurement is, since
   * nothing here knows what was measured — the only thing settled at this
   * point is what the limit says.
   */
  private resolveLimits(
    limits: CodometerLimit[] | undefined,
  ): ResolvedCodometerLimit[] {
    return (limits ?? []).map((limit) => ({
      label: limit.label,
      metric: limit.metric,
      severity: limit.severity ?? DEFAULT_LIMIT_SEVERITY,
      value: this.parseLimitValue(limit),
    }));
  }

  /** Applies defaults to one markdown output destination. */
  private resolveMarkdownOutput(
    output: CodometerMarkdownOutput,
    customStatistics: readonly ResolvedCodometerCustomStatistic[],
  ): ResolvedCodometerMarkdownOutput {
    return {
      custom: this.selectCustomStatistics(output.custom, customStatistics),
      description: output.description,
      endMarker: output.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
      path: output.path,
      startMarker: output.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
      type: "markdown",
      // Left unset rather than defaulted: the built-in rendering and writing
      // live in the CLI that calls it, so "unset" is what selects it.
      write: output.write,
    };
  }

  /** Applies defaults to every declared output destination. */
  private resolveOutputs(
    outputs: CodometerOutput[] | undefined,
    customStatistics: readonly ResolvedCodometerCustomStatistic[],
  ): ResolvedCodometerOutput[] {
    return (outputs ?? []).map((output) =>
      output.type === "json"
        ? this.resolveJsonOutput(output, customStatistics)
        : this.resolveMarkdownOutput(output, customStatistics),
    );
  }

  /**
   * Picks out the top-level custom statistics an output's own `custom` array
   * selected, by label.
   *
   * The schema already refuses a label naming no top-level declaration, so a
   * label failing to resolve here is dropped rather than treated as another
   * way to fail: this method's job is the lookup, not re-validating what the
   * schema already guarantees.
   */
  private selectCustomStatistics(
    labels: string[] | undefined,
    customStatistics: readonly ResolvedCodometerCustomStatistic[],
  ): ResolvedCodometerCustomStatistic[] {
    const byLabel = new Map(
      customStatistics.map((statistic) => [statistic.label, statistic]),
    );

    return (labels ?? []).flatMap((label) => {
      const statistic = byLabel.get(label);

      return statistic === undefined ? [] : [statistic];
    });
  }

  // 🌎 Public Methods

  /** Validates a configuration object, refusing it in prose rather than in JSON. */
  public parseConfiguration(configuration: unknown): CodometerConfiguration {
    return this.parseConfigurationInternal(configuration);
  }

  /**
   * Fills in every field a configuration file may leave out.
   *
   * Exposed so a host embedding codometer can hand over a configuration object
   * it assembled itself and get the same shape a configuration file produces.
   */
  public resolveConfiguration(
    configuration: CodometerConfiguration,
  ): ResolvedCodometerConfiguration {
    const custom = this.resolveCustomStatistics(configuration.custom);

    return {
      custom,
      defaultInput: configuration.defaultInput,
      // Additive rather than a replacement: the defaults are directories no
      // repository wants counted, so a configuration naming its own noise
      // should not have to restate them to keep them out.
      exclude: [
        ...new Set([
          ...DEFAULT_EXCLUDE_GLOBS,
          ...(configuration.exclude ?? []),
        ]),
      ],
      excludeFrom: configuration.excludeFrom ?? [],
      format: configuration.format,
      inputs: this.resolveInputs(configuration.inputs),
      limits: this.resolveLimits(configuration.limits),
      outputs: this.resolveOutputs(configuration.outputs, custom),
      python: {
        command: configuration.python?.command ?? DEFAULT_PYTHON_COMMAND,
      },
    };
  }
}
