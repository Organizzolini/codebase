import path from "node:path";

import { ScoringService } from "@conformetry/languages";
import { Injectable } from "@nestjs/common";

import { DEFAULT_THRESHOLD, SCORE_KEY_SEPARATOR } from "./validation.constants";

import type {
  ScoreInstanceArguments,
  ScoreInstancesArguments,
} from "./validation.types";
import type { MatchedInstance } from "@conformetry/configuration";
import type { InstanceScore } from "@conformetry/core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Scores each matched instance and decides whether it clears its threshold.
 *
 * Scoring is deliberately separate from the report. Deduplication picks which
 * template gets to *print* a shared file's finding, but a score answers a
 * different question — how much of this instance's own template it honours —
 * so it is taken from what validation found before any of that is collapsed.
 */
@Injectable()
/* v8 ignore stop */
export class ValidationScoringService {
  // 🏗 Dependency Injection

  constructor(private readonly scoringService: ScoringService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The instance's own directory.
   *
   * `Instance.path` is the directory the template's tree is laid *over* — the
   * parent — so every module in a project shares it. Joining the name stem is
   * what tells `aspects` from `ephemeris`, and without it every module of a
   * project collapses onto one score.
   */
  private resolveInstancePath(instance: MatchedInstance): string {
    return path.join(instance.instance.path, instance.instance.nameStem);
  }

  /** Keys a score by the instance and template it describes. */
  private resolveScoreKey(score: InstanceScore): string {
    return [score.instancePath, score.templateName].join(SCORE_KEY_SEPARATOR);
  }

  // 🌎 Public Methods

  /**
   * Resolves which threshold applies, narrowest level first.
   *
   * An instance group is more specific than the generator that owns it, and
   * the generator is more specific than a flag covering the whole run. The
   * built-in default applies only when nothing else has an opinion, which is
   * why no earlier level may be pre-filled with it.
   */
  public resolveThreshold(args: ScoreInstanceArguments): number {
    return (
      args.instance.instance.threshold ??
      args.instance.template.threshold ??
      args.runThreshold ??
      DEFAULT_THRESHOLD
    );
  }

  /** Scores one matched instance against the threshold that applies to it. */
  public scoreInstance(args: ScoreInstanceArguments): InstanceScore {
    const failedWeight = args.fileResults.reduce((total, fileResult) => {
      return total + this.scoringService.sumWeights(fileResult.differences);
    }, 0);
    const totalWeight = args.totalWeight;
    const score = this.scoringService.calculateScore({
      failedWeight,
      totalWeight,
    });
    const threshold = this.resolveThreshold(args);

    return {
      failedWeight,
      instancePath: this.resolveInstancePath(args.instance),
      // A placeholder nothing revealed leaves the template unrendered, so no
      // score can vouch for the instance.
      ok:
        score >= threshold &&
        !args.fileResults.some((fileResult) => {
          return fileResult.differences.some((difference) => {
            return difference.differenceType === "placeholder";
          });
        }),
      score,
      templateName: args.instance.template.name,
      threshold,
      totalWeight,
    };
  }

  /**
   * Scores every matched instance, reporting each instance and template pair
   * once.
   *
   * The same directory is matched repeatedly when several generators declare
   * overlapping globs — `src/modules/*` belongs to more than one template — so
   * without this the summary prints the same score several times over. A
   * genuine tie against two *different* templates is kept: those are two real
   * requirements the instance answers to.
   *
   * When two groups claim the same instance with different thresholds, the
   * strictest wins. Nothing makes one group more specific than another, so
   * order would otherwise decide it; letting the strictest win at least means
   * adding a lenient group can never silently relax a bar someone else set.
   */
  public scoreInstances(args: ScoreInstancesArguments): InstanceScore[] {
    const scoresByKey = new Map<string, InstanceScore>();

    for (const group of args.groups) {
      const score = this.scoreInstance({
        fileResults: group.fileResults,
        instance: group.instance,
        runThreshold: args.runThreshold,
        totalWeight: group.totalWeight,
      });
      const key = this.resolveScoreKey(score);
      const existing = scoresByKey.get(key);

      if (existing === undefined || score.threshold > existing.threshold) {
        scoresByKey.set(key, score);
      }
    }

    return [...scoresByKey.values()];
  }
}
