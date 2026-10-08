import { Injectable } from "@nestjs/common";

/**
 * Two roots in one class, promoted for two different reasons.
 *
 * `publish` is an `orphan-root`: nothing calls it, so the safety net picks it
 * up. `collect` has a caller — `publish` — and would therefore head no stack at
 * all, which is what a package's real surface usually looks like from the
 * inside. It is a root because this package's own `callidescope.config.ts`
 * names its address, and the report calls that kind `declared`.
 */
@Injectable()
export class DeclaredEntryPointsService {
  // 🔏 Private Methods

  /** Renders whatever was collected, and ends both stacks. */
  private render(entries: string): string {
    return entries.trim();
  }

  // 🌎 Public Methods

  /** The surface this package declares, called from inside it all the same. */
  public collect(entries: string): string {
    return this.render(entries);
  }

  /** Nothing calls this, so nothing had to declare it. */
  public publish(entries: string): string {
    return this.collect(entries);
  }
}
