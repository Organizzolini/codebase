import { Injectable } from "@nestjs/common";

/**
 * A mutually recursive cluster of three, collapsed before depth is measured.
 *
 * `descend` calls `branch`, `branch` calls `leaf`, and `leaf` calls `descend`
 * again. The three sit in one cycle, so callidescope condenses them into a
 * single component contributing three frames once — an honest floor on a stack
 * that has no ceiling.
 *
 * The alternative, noticing a repeat visit part-way through the walk, makes the
 * answer depend on which path arrived first: the same method then reports a
 * different depth from a different entry point, and between runs. Numbers that
 * move on their own cannot gate a pull request.
 *
 * `traverse` is not part of the cycle, and it has to exist. Every member of a
 * cycle has a caller *inside* the cycle, so none of the three is ever promoted
 * as an orphan root, and a cluster nothing outside it calls is reachable from
 * no root at all — it would contribute a cyclic component to the run summary
 * and never appear as a stack. Real recursive code is always called from
 * somewhere; this is that somewhere.
 */
@Injectable()
export class MutualRecursionService {
  // 🔏 Private Methods

  /** Second of the three, one hop from the leaf. */
  private branch(remaining: number): number {
    return this.leaf(remaining);
  }

  /** First of the three, and the way into the cycle. */
  private descend(remaining: number): number {
    return this.branch(remaining);
  }

  /** Third of the three, which calls back to the first. */
  private leaf(remaining: number): number {
    return remaining <= 0 ? 0 : this.descend(remaining - 1);
  }

  // 🌎 Public Methods

  /** Enters the cycle from outside it, so the cluster has a root above it. */
  public traverse(remaining: number): number {
    return this.descend(remaining);
  }
}
