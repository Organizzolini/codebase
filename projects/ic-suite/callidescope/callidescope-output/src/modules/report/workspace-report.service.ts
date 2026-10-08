import { Injectable } from "@nestjs/common";

import {
  HEADROOM_BUCKET_AT_LIMIT,
  HEADROOM_BUCKET_FOUR_PLUS,
  HEADROOM_BUCKET_ONE,
  HEADROOM_BUCKET_ORDER,
  HEADROOM_BUCKET_OVER_LIMIT,
  HEADROOM_BUCKET_TWO_TO_THREE,
  HEADROOM_BUCKET_UNMEASURED,
  MARKDOWN_HEADROOM_HEADER,
  MARKDOWN_PROJECT_INDEX_HEADER,
  ROOT_PROJECT_LABEL,
} from "./report.constants";

import type {
  ProjectIndexRow,
  RenderProjectIndexArguments,
} from "./report.types";
import type {
  ProjectLimits,
  ProjectLimitsLookup,
} from "@callidescope/configuration";
import type { ProjectReport } from "@callidescope/core";

/**
 * Renders what a whole run says about the projects in it, rather than about
 * one callable or one stack.
 *
 * Its own service because it answers a question the rest of the report cannot.
 * Every other section names callables — a stack, a spread, a wide callable —
 * and a workspace holding fifty projects is not readable as a list of
 * callables. These two sections are the index and the scoreboard: which
 * project holds what, and how much room each has left before its own limit
 * stops it.
 *
 * Both are keyed on a project's own resolved limit rather than one workspace
 * number. A limit pinned by the single worst stack anywhere in a repository
 * gates nothing for the projects nowhere near it, which is the whole reason
 * limits resolve per project — so a report that showed one number would be
 * describing a model the tool no longer has.
 */
@Injectable()
export class WorkspaceReportService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Sorts a project's headroom into the bucket the scoreboard counts it under.
   *
   * A project measuring nothing is its own bucket rather than a large
   * headroom, and that distinction is the point of having the scoreboard at
   * all: a project whose deepest stack is zero has every frame of its limit
   * unused, which reads as the safest row in the table while actually being
   * the one row where the limit gates nothing. Bucketing it by `limit - 0`
   * would file the least-gated projects among the healthiest.
   */
  private bucketFor(row: ProjectIndexRow): string {
    if (row.deepest === 0) {
      return HEADROOM_BUCKET_UNMEASURED;
    }

    if (row.headroom < 0) {
      return HEADROOM_BUCKET_OVER_LIMIT;
    }

    if (row.headroom === 0) {
      return HEADROOM_BUCKET_AT_LIMIT;
    }

    if (row.headroom === 1) {
      return HEADROOM_BUCKET_ONE;
    }

    return row.headroom <= 3
      ? HEADROOM_BUCKET_TWO_TO_THREE
      : HEADROOM_BUCKET_FOUR_PLUS;
  }

  /** The widest single callable a project declares, or zero when it has none. */
  private widestBreadth(report: ProjectReport): number {
    return report.callableBreadths.reduce(
      (widest, candidate) => Math.max(widest, candidate.breadth),
      0,
    );
  }

  // 🌎 Public Methods

  /**
   * Reads each project's report and its resolved limits into one row.
   *
   * Public so both sections render from the same rows rather than each
   * deriving them: the scoreboard counts exactly the rows the index lists, and
   * two derivations of "headroom" that could disagree would be worse than one
   * that is merely wrong.
   */
  public buildRows(args: RenderProjectIndexArguments): ProjectIndexRow[] {
    const rows = args.projects.map((report) => {
      const limits = this.limitsFor({
        limits: args.limits,
        projectName: report.projectName,
      });
      const deepest = report.summary.maximumDepth;

      return {
        deepest,
        headroom: limits.maximumDepth - deepest,
        limit: limits.maximumDepth,
        projectName: report.projectName,
        widest: this.widestBreadth(report),
      };
    });

    // Tightest first, because the order is the point: the rows at the top are
    // the ones a ratchet cannot descend past, and a reader scanning for what
    // to fix next should not have to sort fifty rows by eye. Ties fall back to
    // the project name so the table is byte-stable between runs — a report
    // whose row order moved on its own would read as stale on every check.
    return rows.toSorted(
      (first, second) =>
        first.headroom - second.headroom ||
        first.projectName.localeCompare(second.projectName),
    );
  }

  /** The limits one project resolved to, or the workspace's when unlisted. */
  public limitsFor(args: {
    limits: ProjectLimitsLookup;
    projectName: string;
  }): ProjectLimits {
    return args.limits.byProject.get(args.projectName) ?? args.limits.workspace;
  }

  /**
   * Counts how many projects sit in each headroom bucket.
   *
   * The index says what every project holds; this says what the set of them
   * adds up to, which is the number a ratchet is actually lowered against. A
   * bucket nothing falls into is still printed, because "nothing is over its
   * limit" is the row a reader is looking for and an absent row cannot say it.
   */
  public renderHeadroom(rows: readonly ProjectIndexRow[]): string {
    const buckets = rows.map((row) => this.bucketFor(row));

    // Counted by filtering the bucket list once per bucket rather than
    // accumulated into a map. Six passes over fifty rows costs nothing, and it
    // leaves no "a bucket that is somehow absent counts as zero" fallback —
    // a branch no test can reach, because the bucket list is what both the
    // counting and the printing iterate.
    return [
      MARKDOWN_HEADROOM_HEADER,
      ...HEADROOM_BUCKET_ORDER.map((bucket) => {
        const count = buckets.filter(
          (candidate) => candidate === bucket,
        ).length;

        return `| ${bucket} | ${String(count)} |`;
      }),
    ].join("\n");
  }

  /**
   * Renders one row per project: what it measured, and what it is held to.
   *
   * `Limit` is a bare number now. It used to carry `declared` or `inherited`
   * beside it, and with every traced project's configuration complete only one
   * of those two is reachable — a column with one value in every row is worse
   * than no column.
   */
  public renderProjectIndex(args: RenderProjectIndexArguments): string {
    const rows = this.buildRows(args);

    if (rows.length === 0) {
      return "None.";
    }

    return [
      MARKDOWN_PROJECT_INDEX_HEADER,
      ...rows.map(
        (row) =>
          `| \`${row.projectName === "" ? ROOT_PROJECT_LABEL : row.projectName}\` | ${String(row.deepest)} | ${String(row.limit)} | ${String(row.headroom)} | ${String(row.widest)} |`,
      ),
    ].join("\n");
  }
}
