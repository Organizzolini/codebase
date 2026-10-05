import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import type { ReportFindingsArguments } from "./report-findings.types";

/**
 * Weighs every finding a run can produce, and fails on the ones it was asked
 * to gate.
 *
 * Kept away from `CallidescopeCommand` itself, the same reason `RunPlanService`
 * is: what a run does with what it found is a question this service answers on
 * its own — through `this.logger` alone — leaving the command to orchestrate
 * the trace rather than weigh its output.
 */
@Injectable()
export class ReportFindingsService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Names the stacks that ran deeper than callidescope allows.
   *
   * Reported whether or not the run gates on them — a stack this long is worth
   * saying out loud even in a run that only wrote a report — but only a run
   * asked to fail on depth fails on it.
   */
  private reportDeepStacks(args: ReportFindingsArguments): boolean {
    const { deepStacks } = args.result;

    if (deepStacks.length === 0) {
      return false;
    }

    this.logger.error(`🔭 Found call stacks too deep`, undefined, {
      count: deepStacks.length,
      deepest: Math.max(...deepStacks.map((stack) => stack.depth)),
      entryPoints: deepStacks.map((stack) => stack.frames[0]?.displayName),
    });

    return args.mode.checksDepth;
  }

  /**
   * Fails a run that traced nothing at all.
   *
   * Unconditional, and not something `--check` turns on. Every other finding
   * is a verdict on code that was read; this one says no code was read, and a
   * gate that passes because it never looked is worse than one that fails —
   * it reports the workspace as clean and there is nothing in the output to
   * say otherwise.
   */
  private reportEmptyTrace(args: ReportFindingsArguments): boolean {
    if (args.result.summary.callableCount > 0) {
      return false;
    }

    this.logger.error("🔭 Traced nothing", undefined, {
      projectCount: args.result.summary.projectCount,
    });

    return true;
  }

  /** Names the destinations that no longer hold what a fresh run would write. */
  private reportStaleness(args: ReportFindingsArguments): boolean {
    if (args.stalePaths.length === 0) {
      return false;
    }

    this.logger.error(`🔭 Found stale reports`, undefined, {
      paths: args.stalePaths,
    });

    return true;
  }

  /**
   * Names the callables that called more things directly than callidescope
   * allows.
   *
   * Reported whether or not the run gates on them, mirroring
   * `reportDeepStacks` — but only a run asked to fail on breadth fails on it.
   */
  private reportWideCallables(args: ReportFindingsArguments): boolean {
    const { wideCallables } = args.result;

    if (wideCallables.length === 0) {
      return false;
    }

    this.logger.error(
      `🔭 Found callables calling too much directly`,
      undefined,
      {
        callables: wideCallables.map((finding) => finding.displayName),
        count: wideCallables.length,
        widest: Math.max(...wideCallables.map((finding) => finding.breadth)),
      },
    );

    return args.mode.checksBreadth;
  }

  // 🌎 Public Methods

  /**
   * Weighs every finding a run can produce, and fails on any of them.
   *
   * They are weighed separately and announced separately. A stack that is too
   * deep is something the code does; a callable calling too many things is
   * something else the code does; a stale report is something the checkout
   * has not caught up with. Reading one as another sends the author to fix
   * the wrong thing.
   *
   * A project that could not be read never reaches here: it ends the trace
   * before anything is printed or written, and is reported by
   * `CallidescopeCommand` itself.
   */
  public reportFindings(args: ReportFindingsArguments): void {
    const stale = this.reportStaleness(args);
    const deep = this.reportDeepStacks(args);
    const wide = this.reportWideCallables(args);
    const empty = this.reportEmptyTrace(args);

    if (deep || empty || stale || wide) {
      process.exitCode = 1;
    }
  }
}
