import { Injectable } from "@nestjs/common";
import moment, { type Moment } from "moment-timezone";

/**
 * Injectable service for generating date sequences used in ephemeris calculations.
 *
 * Provides generators for iterating over consecutive minutes or calendar days
 * within a date range.
 */
@Injectable()
export class DatetimeService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Generates day-by-day timezone-aware dates from start to end (inclusive).
   *
   * Each yielded moment represents the start of a calendar day in the given timezone.
   */
  *generateDates(
    start: Moment,
    end: Moment,
    timezone: string,
  ): Generator<Moment> {
    const endDate = end.clone().tz(timezone).startOf("day");
    const date = start.clone().tz(timezone).startOf("day");
    while (!date.isAfter(endDate)) {
      yield date.clone();
      date.add(1, "day");
    }
  }

  /**
   * Generates minute-by-minute UTC dates from start to end (inclusive).
   */
  *generateMinutes(start: Moment, end: Moment): Generator<Moment> {
    const endMs = end.valueOf();
    let currentMs = start.valueOf();
    while (currentMs <= endMs) {
      yield moment.utc(currentMs);
      currentMs += 60_000;
    }
  }
}
