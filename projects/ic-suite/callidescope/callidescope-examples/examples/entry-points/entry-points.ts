import { Get, Injectable } from "@nestjs/common";

/**
 * Two of the entry-point kinds, in the shapes a framework really calls.
 *
 * Neither method is called by anything in this package. Both are still roots,
 * and for stated reasons rather than as a fallback: one carries a configured
 * decorator, the other is a NestJS lifecycle hook. Each calls one helper so it
 * has a stack to appear in — a root with nothing below it is a root, but not
 * yet a call stack.
 */
@Injectable()
export class EntryPointsService {
  // 🔏 Private Methods

  /** Builds the body a decorated request handler answers with. */
  private buildReport(): string {
    return "report";
  }

  /** Does the work a lifecycle hook is called to do. */
  private prepareCache(): string {
    return "prepared";
  }

  // 🌎 Public Methods

  /** A lifecycle hook a framework calls — the `lifecycle` kind. */
  public onModuleInit(): string {
    return this.prepareCache();
  }

  /** A decorated method — the `decorated-method` kind. */
  @Get()
  public readReport(): string {
    return this.buildReport();
  }
}

/**
 * The safety net: a callable nothing calls, promoted to a root anyway.
 *
 * No decorator claims it, no lifecycle name matches, and it is not exported
 * from a barrel or a bootstrap. Without orphan promotion it would simply vanish
 * from every measurement — and so would everything below it — which is exactly
 * the failure mode a missing entry-point rule would otherwise cause silently.
 * Promoted, it shows up as an `orphan-root`, which is itself worth knowing: an
 * orphan is either dead code or a rule that needs adding.
 */
export function summarizeOrphanedWork(entries: readonly string[]): number {
  return entries.length;
}
