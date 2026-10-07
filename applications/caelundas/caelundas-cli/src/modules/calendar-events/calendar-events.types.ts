// 🏷️ Types
import type { Moment } from "moment-timezone";

/** An observer location in decimal degrees. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** The range and location whose events {@link CalendarEventsService.findInRange} returns. */
export interface FindInRangeParameters extends Coordinates {
  /** Exclusive end of the range. */
  end: Moment;

  /** Inclusive start of the range. */
  start: Moment;
}
