import moment from "moment-timezone";

import type { Moment } from "moment-timezone";
import type { ValueTransformer } from "typeorm";

// 🌎 Utilities

/**
 * Carries a `timestamptz` column as the `Moment` every detector and writer
 * works in: it writes the instant a moment names, and reads one back in UTC,
 * so a stored event renders exactly as the detected one did. Anything else,
 * a null, an undefined, or a date inside a find operator, passes through.
 */
export function createMomentTransformer(): ValueTransformer {
  return {
    from: (value?: Date | null): Moment | null | undefined =>
      value === null || value === undefined ? value : moment.utc(value),
    to: (value?: Date | Moment | null): Date | null | undefined =>
      moment.isMoment(value) ? value.toDate() : value,
  };
}
