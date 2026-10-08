import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { LoggerService } from "@codebase/logging";

import { CalendarEvent } from "../caelundas-database/entities/calendar-event.entity";

import {
  CALENDAR_EVENT_BATCH_SIZE,
  CALENDAR_EVENT_CONFLICT_COLUMNS,
  CALENDAR_EVENT_UPDATE_COLUMNS,
} from "./calendar-events.constants";
import { formatCoordinate } from "./calendar-events.utilities";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type {
  Coordinates,
  FindInRangeParameters,
} from "./calendar-events.types";
import type { UpdatableEntity } from "@codebase/database";

/**
 * Persists the events a run detects and reads them back for rendering.
 *
 * An event is keyed by its summary, start, and the location it was computed
 * for, so writing the same event again updates its row instead of adding one.
 */
@Injectable()
export class CalendarEventsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepository: Repository<CalendarEvent>,
  ) {
    this.logger.setContext(CalendarEventsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The row an event becomes for one location. */
  private toRow(
    event: DetectedCalendarEvent,
    coordinates: Coordinates,
  ): Omit<CalendarEvent, keyof UpdatableEntity> {
    return {
      categories: event.categories,
      color: event.color ?? null,
      description: event.description,
      end: event.end,
      latitude: formatCoordinate(coordinates.latitude),
      location: event.location ?? null,
      longitude: formatCoordinate(coordinates.longitude),
      start: event.start,
      summary: event.summary,
    };
  }

  // 🌎 Public Methods

  /**
   * Returns the stored events at one location that overlap a range, ordered
   * by start. An event overlaps when it starts before the range ends and ends
   * after the range starts, so one spanning either edge, like a retrograde,
   * is included; an instant is included when it falls inside the range.
   */
  async findInRange(
    parameters: FindInRangeParameters,
  ): Promise<CalendarEvent[]> {
    return this.calendarEventRepository
      .createQueryBuilder("calendarEvent")
      .where("calendarEvent.latitude = :latitude", {
        latitude: formatCoordinate(parameters.latitude),
      })
      .andWhere("calendarEvent.longitude = :longitude", {
        longitude: formatCoordinate(parameters.longitude),
      })
      .andWhere("calendarEvent.start < :end", { end: parameters.end.toDate() })
      .andWhere(
        "(calendarEvent.end > :start OR (calendarEvent.end = calendarEvent.start AND calendarEvent.start >= :start))",
        { start: parameters.start.toDate() },
      )
      .orderBy("calendarEvent.start", "ASC")
      .addOrderBy("calendarEvent.summary", "ASC")
      .getMany();
  }

  /**
   * Writes events for one location, updating the row of any event already
   * stored. Rows go in batches that stay under Postgres's bind-parameter
   * limit, and a repeated key within the input keeps its last occurrence, as
   * one statement may not update the same row twice.
   */
  async upsert(
    events: DetectedCalendarEvent[],
    coordinates: Coordinates,
  ): Promise<void> {
    const rowsByKey = new Map<string, ReturnType<typeof this.toRow>>();
    for (const event of events) {
      const row = this.toRow(event, coordinates);
      rowsByKey.set(`${row.summary}\u0000${row.start.toISOString()}`, row);
    }
    const rows = [...rowsByKey.values()];

    for (
      let offset = 0;
      offset < rows.length;
      offset += CALENDAR_EVENT_BATCH_SIZE
    ) {
      await this.calendarEventRepository
        .createQueryBuilder()
        .insert()
        .into(CalendarEvent)
        .values(rows.slice(offset, offset + CALENDAR_EVENT_BATCH_SIZE))
        .orUpdate(
          [...CALENDAR_EVENT_UPDATE_COLUMNS],
          [...CALENDAR_EVENT_CONFLICT_COLUMNS],
        )
        .execute();
    }

    this.logger.info("💾 Stored events", undefined, {
      count: rows.length,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  }
}
