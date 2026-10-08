import { Injectable } from "@nestjs/common";

import { normalizeLabel as normalize } from "./normalize-label.js";

/**
 * The plainest call there is, written through an import alias.
 *
 * Callidescope resolves `normalize(…)` to the symbol at the callee and unwraps
 * the alias, so the frame it records is `normalizeLabel` — the declaration —
 * rather than the local name this file happens to have given it.
 */
@Injectable()
export class PlainCallService {
  // 🌎 Public Methods

  /** Renders a label through the aliased helper. */
  public render(label: string): string {
    return normalize(label);
  }
}
