import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { CustomizationInput } from "./customization.types";
import type { ResolvedCodometerCustomStatistic } from "@codometer/configuration";
import type { CustomStatisticResult } from "@codometer/core";
import type {
  CommentCounter,
  CommentMeasurement,
  TypescriptSymbolCounter,
} from "@codometer/languages";

/**
 * Counts the conventions a repository holds itself to.
 *
 * The languages a repository is written in are the same everywhere; what a
 * `*.service.ts` means, or whether a static method is something to keep an
 * eye on, is not — which is why these counters come from the configuration
 * rather than from this package.
 *
 * A counter measures files by path, declarations by shape, or a comment
 * budget by length. The file half is done here; the declaration half is
 * tallied by the TypeScript analyzer during the walk it already makes, and
 * the comment half by `@codometer/languages`' comment services — both arrive
 * here as counts to be labelled.
 */
@Injectable()
export class CustomizationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Turn a `comment`-selector statistic's own breaches into its result. */
  private buildCommentResult(
    statistic: ResolvedCodometerCustomStatistic,
    commentCounts: Record<string, CommentMeasurement[]>,
  ): CustomStatisticResult {
    const breaches = (commentCounts[statistic.label] ?? []).filter(
      (measurement) => measurement.breached,
    );

    return {
      color: statistic.color,
      count: breaches.length,
      group: statistic.group,
      instances: breaches.map((measurement) => ({
        file: measurement.file,
        line: measurement.line,
        measured: measurement.measured,
      })),
      label: statistic.label,
    };
  }

  /**
   * Counts the target's files that at least one of the globs claims.
   *
   * A file matching several globs of the same counter is one file, not
   * several: the counter asks how many files there are, not how many times
   * they matched.
   */
  private countMatches(files: string[], patterns: string[]): number {
    return files.filter((filePath) =>
      patterns.some((pattern) => path.matchesGlob(filePath, pattern)),
    ).length;
  }

  // 🌎 Public Methods

  /** Count every configured statistic over the discovered files. */
  analyze({
    commentCounts,
    files,
    statistics,
    symbolCounts,
  }: CustomizationInput): CustomStatisticResult[] {
    return statistics.map((statistic) => {
      if (statistic.comment !== undefined) {
        return this.buildCommentResult(statistic, commentCounts);
      }

      return {
        color: statistic.color,
        count:
          statistic.symbols === undefined
            ? this.countMatches(files, statistic.patterns)
            : (symbolCounts[statistic.label] ?? 0),
        group: statistic.group,
        label: statistic.label,
      };
    });
  }

  /**
   * Pick out the counters `@codometer/languages`' comment services have to
   * measure.
   *
   * Handed to those services rather than measured again here: a `comment`
   * selector names a language or a documentable kind, and turning that into a
   * budget is this package's business, not the tokenizer's. One list, mirroring
   * the selector field for field — which counter a given measurer takes is
   * decided by each measurer, which selects from the list by reading `kind`.
   */
  buildCommentCounters(
    statistics: CustomizationInput["statistics"],
  ): CommentCounter[] {
    const counters: CommentCounter[] = [];

    for (const statistic of statistics) {
      const { comment, label } = statistic;

      if (comment === undefined) {
        continue;
      }

      counters.push({
        budget: {
          maximumCharacters: comment.maximumCharacters,
          maximumLines: comment.maximumLines,
          maximumWords: comment.maximumWords,
          severity: comment.severity,
        },
        kind: comment.kind,
        label,
        language: comment.language,
      });
    }

    return counters;
  }

  /**
   * Pick out the counters the TypeScript analyzer has to tally.
   *
   * Handed to that analyzer rather than parsed again here: it already walks
   * every source file, and a second walk would double the slowest part of a
   * run to learn what the first one passed straight over.
   */
  buildSymbolCounters(
    statistics: CustomizationInput["statistics"],
  ): TypescriptSymbolCounter[] {
    return statistics.flatMap((statistic) =>
      statistic.symbols === undefined
        ? []
        : [
            {
              kinds: statistic.symbols.kinds,
              label: statistic.label,
              modifiers: statistic.symbols.modifiers ?? [],
              patterns: statistic.patterns,
            },
          ],
    );
  }
}
