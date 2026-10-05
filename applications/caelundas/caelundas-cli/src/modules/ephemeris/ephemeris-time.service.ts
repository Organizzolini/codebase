import { Injectable } from "@nestjs/common";
import moment, { type Moment } from "moment-timezone";
import { utc_to_jd } from "sweph";

import { GREGORIAN_CALENDAR_FLAG } from "./ephemeris.constants";

import type { JulianDays } from "./internal-ephemeris.types";

/**
 * Time conversion and iteration utilities for ephemeris calculations.
 */
@Injectable()
export class EphemerisTimeService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Converts a UTC moment to Julian Day ephemeris and universal time numbers.
   *
   * @throws When utc_to_jd fails (invalid calendar or internal error).
   */
  public dateToJulianDays(date: Moment): JulianDays {
    const result = utc_to_jd(
      date.utc().year(),
      date.utc().month() + 1,
      date.utc().date(),
      date.utc().hours(),
      date.utc().minutes(),
      date.utc().seconds(),
      GREGORIAN_CALENDAR_FLAG,
    );
    if (result.flag < 0) {
      throw new Error(
        `utc_to_jd failed for ${date.toISOString()}: ${result.error}`,
      );
    }
    return {
      julianDayEphemerisTime: result.data[0],
      julianDayUniversalTime: result.data[1],
    };
  }

  /**
   * Generates minute-by-minute moments from start (inclusive) to end (inclusive).
   */
  public *generateMinutes(start: Moment, end: Moment): Generator<Moment> {
    const endMs = end.valueOf();
    let currentMs = start.valueOf();
    while (currentMs <= endMs) {
      yield moment.utc(currentMs);
      currentMs += 60_000;
    }
  }
}
