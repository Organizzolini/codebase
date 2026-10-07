import { Column, Entity, Index, Unique } from "typeorm";

import { UpdatableEntity } from "@codebase/database";

/**
 * One row of the `calendar_events` table, in the schema that
 * `CAELUNDAS_POSTGRES_SCHEMA` names: a single astronomical event as detected
 * for one observer location.
 *
 * An event is identified by its natural key, the summary, start, latitude,
 * and longitude together: a run for the same place that detects the same
 * event again updates the row it already wrote, and a run for a second place
 * adds rows of its own, even for an event the sky shows everywhere. Latitude
 * and longitude are `numeric` rather than floating point so that key compares
 * exactly; `pg` returns a `numeric` as a string, so read them as such.
 *
 * `start` and `end` are equal for an instantaneous event. `categories` is a
 * Postgres array with a GIN index, so a reader can filter on one in SQL.
 */
@Entity({ name: "calendar_events" })
@Index("calendar_events_categories_gin", ["categories"], { type: "gin" })
@Unique("calendar_events_natural_key", [
  "summary",
  "start",
  "latitude",
  "longitude",
])
export class CalendarEvent extends UpdatableEntity {
  @Column("text", {
    array: true,
    comment: "Category tags for filtering, such as aspects, major, and moon",
  })
  categories!: string[];

  @Column("text", {
    comment: "Color hint for calendar display",
    nullable: true,
  })
  color!: null | string;

  @Column("text", { comment: "Detailed description with additional context" })
  description!: string;

  @Column("timestamptz", { comment: "When the event ends", name: "end" })
  end!: Date;

  @Column("numeric", {
    comment: "Observer latitude in degrees the event was computed for",
    precision: 8,
    scale: 6,
  })
  latitude!: string;

  @Column("text", {
    comment: "Human-readable location of the event",
    nullable: true,
  })
  location!: null | string;

  @Column("numeric", {
    comment: "Observer longitude in degrees the event was computed for",
    precision: 9,
    scale: 6,
  })
  longitude!: string;

  @Column("timestamptz", { comment: "When the event starts", name: "start" })
  start!: Date;

  @Column("text", { comment: "Brief event title shown in calendar views" })
  summary!: string;
}
