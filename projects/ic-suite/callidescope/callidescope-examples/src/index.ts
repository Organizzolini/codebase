import { normalizeLabel } from "../examples/plain-call/normalize-label.js";

// 📤 Exports

/**
 * The `exported-function` entry-point kind.
 *
 * A function declared and exported from `src/index.ts` is a root because a
 * package's barrel is its contract with everything outside the repository —
 * nothing here has to call it for it to be reachable.
 *
 * It lives in `src/` rather than beside the other entry-point fixtures because
 * the rule keys on that literal path. See `examples/entry-points`.
 */
export const normalizeExampleLabel = (label: string): string =>
  normalizeLabel(label);
