import moment from "moment-timezone";

import { COORDINATE_DECIMAL_PLACES } from "./calendar-events.constants";

import type { CalendarEvent } from "../caelundas-database/entities/calendar-event.entity";
import type { Event } from "../calendar/calendar.types";

/**
 * A coordinate rounded to the decimals the column stores, as the string
 * `pg` exchanges a `numeric` as, so what is written and what is looked up
 * compare exactly.
 */
export function formatCoordinate(coordinate: number): string {
  return coordinate.toFixed(COORDINATE_DECIMAL_PLACES);
}

/** Rebuilds the calendar's `Event` from a stored `CalendarEvent` row, in UTC. */
export function toEvent(row: CalendarEvent): Event {
  return {
    categories: row.categories,
    color: row.color ?? undefined,
    description: row.description,
    end: moment.utc(row.end),
    location: row.location ?? undefined,
    start: moment.utc(row.start),
    summary: row.summary,
  };
}
