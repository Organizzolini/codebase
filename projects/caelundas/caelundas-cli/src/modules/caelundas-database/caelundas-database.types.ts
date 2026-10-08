// 🏷️ Types
import type { CalendarEvent } from "./entities/calendar-event.entity";
import type { UpdatableEntity } from "@codebase/database";

/**
 * A {@link CalendarEvent} as a detector builds it and a writer reads it:
 * without the fields the database owns, the id and audit columns, or the
 * observer coordinates, which `CalendarEventsService.upsert` adds for the
 * location it stores the event for. A stored row is one as well, and the
 * writers are passed the stored rows `findInRange` returns, not detected ones.
 */
export type DetectedCalendarEvent = Omit<
  CalendarEvent,
  "latitude" | "longitude" | keyof UpdatableEntity
>;
