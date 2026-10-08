import { Injectable } from "@nestjs/common";

/** The handlers a computed member name selects between at runtime. */
const REPORT_HANDLERS: Record<string, () => string> = {
  csv: () => "csv",
  json: () => "json",
};

/**
 * A stack whose real depth is unknowable, reported as a floor.
 *
 * Eight frames of ordinary forwarding end at `REPORT_HANDLERS[format]()`, where
 * the member name is a value rather than a name in the syntax. Nothing about
 * the call site says which handler runs, so callidescope records the call as
 * unfollowable rather than guessing — and every stack passing through it prints
 * its depth as `≥ 8` instead of `8`.
 */
@Injectable()
export class ComputedMemberService {
  // 🔏 Private Methods

  /** Applies the selected handler, whichever one that turns out to be. */
  private apply(format: string): string {
    return REPORT_HANDLERS[format]?.() ?? "";
  }

  /** Chooses a handler by name. */
  private choose(format: string): string {
    return this.apply(format);
  }

  /** Normalizes the requested format before anything routes on it. */
  private normalize(format: string): string {
    return this.route(format.trim());
  }

  /** Prepares the format string the handler table is keyed by. */
  private prepare(format: string): string {
    return this.choose(format.toLowerCase());
  }

  /** Reads the request's format and passes it on. */
  private read(format: string): string {
    return this.normalize(format);
  }

  /** Routes the request one layer further down. */
  private route(format: string): string {
    return this.select(format);
  }

  /** Selects the branch that prepares the format. */
  private select(format: string): string {
    return this.prepare(format);
  }

  // 🌎 Public Methods

  /** Dispatches a report request to a handler named at runtime. */
  public dispatch(format: string): string {
    return this.read(format);
  }
}
