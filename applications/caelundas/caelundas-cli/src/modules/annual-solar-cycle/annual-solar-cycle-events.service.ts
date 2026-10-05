import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
  APHELION_CATEGORY,
  PERIHELION_CATEGORY,
  SOLAR_CYCLE_EVENT_TIMEZONE,
  SOLAR_CYCLE_LONGITUDE_THRESHOLDS,
} from "./annual-solar-cycle.constants";

import type { Event } from "../calendar/calendar.types";
import type {
  BuildSolarCycleEventArguments,
  SolarCycleLongitudes,
} from "./annual-solar-cycle.types";
import type { Moment } from "moment-timezone";

/**
 * Builds annual solar cycle events and evaluates solar longitude thresholds.
 */
@Injectable()
export class AnnualSolarCycleEventsService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(AnnualSolarCycleEventsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds a calendar event anchored at a single minute. */
  private buildSolarCycleEvent(args: BuildSolarCycleEventArguments): Event {
    const { categories, date, description, summary } = args;
    const dateString = date
      .clone()
      .tz(SOLAR_CYCLE_EVENT_TIMEZONE)
      .toISOString(true);
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: dateString,
      summary,
    });
    return {
      categories: [...categories],
      description,
      end: date,
      start: date,
      summary,
    };
  }

  /** Collects autumn events for the detected longitude crossing. */
  private getAutumnEvents(
    longitudes: SolarCycleLongitudes,
    date: Moment,
  ): Event[] {
    const events: Event[] = [];
    if (this.isAutumnalEquinox(longitudes)) {
      events.push(this.buildAutumnalEquinoxEvent(date));
    }
    if (this.isNinthHexadecan(longitudes)) {
      events.push(this.buildNinthHexadecanEvent(date));
    }
    if (this.isSamhain(longitudes)) {
      events.push(this.buildSamhainEvent(date));
    }
    if (this.isEleventhHexadecan(longitudes)) {
      events.push(this.buildEleventhHexadecanEvent(date));
    }
    return events;
  }

  /** Collects spring events for the detected longitude crossing. */
  private getSpringEvents(
    longitudes: SolarCycleLongitudes,
    date: Moment,
  ): Event[] {
    const events: Event[] = [];
    if (this.isVernalEquinox(longitudes)) {
      events.push(this.buildVernalEquinoxEvent(date));
    }
    if (this.isFirstHexadecan(longitudes)) {
      events.push(this.buildFirstHexadecanEvent(date));
    }
    if (this.isBeltane(longitudes)) {
      events.push(this.buildBeltaneEvent(date));
    }
    if (this.isThirdHexadecan(longitudes)) {
      events.push(this.buildThirdHexadecanEvent(date));
    }
    return events;
  }

  /** Collects summer events for the detected longitude crossing. */
  private getSummerEvents(
    longitudes: SolarCycleLongitudes,
    date: Moment,
  ): Event[] {
    const events: Event[] = [];
    if (this.isSummerSolstice(longitudes)) {
      events.push(this.buildSummerSolsticeEvent(date));
    }
    if (this.isFifthHexadecan(longitudes)) {
      events.push(this.buildFifthHexadecanEvent(date));
    }
    if (this.isLammas(longitudes)) {
      events.push(this.buildLammasEvent(date));
    }
    if (this.isSeventhHexadecan(longitudes)) {
      events.push(this.buildSeventhHexadecanEvent(date));
    }
    return events;
  }

  /** Collects winter events for the detected longitude crossing. */
  private getWinterEvents(
    longitudes: SolarCycleLongitudes,
    date: Moment,
  ): Event[] {
    const events: Event[] = [];
    if (this.isWinterSolstice(longitudes)) {
      events.push(this.buildWinterSolsticeEvent(date));
    }
    if (this.isThirteenthHexadecan(longitudes)) {
      events.push(this.buildThirteenthHexadecanEvent(date));
    }
    if (this.isImbolc(longitudes)) {
      events.push(this.buildImbolcEvent(date));
    }
    if (this.isFifteenthHexadecan(longitudes)) {
      events.push(this.buildFifteenthHexadecanEvent(date));
    }
    return events;
  }

  /** Returns true when the longitude crossed the provided threshold from below. */
  private hasCrossedSolarLongitude(
    args: SolarCycleLongitudes,
    threshold: number,
  ): boolean {
    const { currentLongitude, previousLongitude } = args;
    return currentLongitude >= threshold && previousLongitude < threshold;
  }

  // 🌎 Public Methods

  /** Builds the solar aphelion event. */
  buildAphelionEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: [...ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES, APHELION_CATEGORY],
      date,
      description: "Solar Aphelion",
      summary: "☀️ ❄️ Solar Aphelion",
    });
  }

  /** Builds the autumnal equinox event. */
  buildAutumnalEquinoxEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Autumnal Equinox",
      summary: "🍂 Autumnal Equinox",
    });
  }

  /** Builds the Beltane event. */
  buildBeltaneEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Beltane",
      summary: "🐦‍🔥 Beltane",
    });
  }

  /** Builds the eleventh hexadecan event. */
  buildEleventhHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Eleventh Hexadecan",
      summary: "🧤 Eleventh Hexadecan",
    });
  }

  /** Builds the fifteenth hexadecan event. */
  buildFifteenthHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Fifteenth Hexadecan",
      summary: "🌨️ Fifteenth Hexadecan",
    });
  }

  /** Builds the fifth hexadecan event. */
  buildFifthHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Fifth Hexadecan",
      summary: "⛱️ Fifth Hexadecan",
    });
  }

  /** Builds the first hexadecan event. */
  buildFirstHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "First Hexadecan",
      summary: "🌳 First Hexadecan",
    });
  }

  /** Builds the Imbolc event. */
  buildImbolcEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Imbolc",
      summary: "🐑 Imbolc",
    });
  }

  /** Builds the Lammas event. */
  buildLammasEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Lammas",
      summary: "🌾 Lammas",
    });
  }

  /** Builds the ninth hexadecan event. */
  buildNinthHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Ninth Hexadecan",
      summary: "🍁 Ninth Hexadecan",
    });
  }

  /** Builds the solar perihelion event. */
  buildPerihelionEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: [...ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES, PERIHELION_CATEGORY],
      date,
      description: "Solar Perihelion",
      summary: "☀️ 🔥 Solar Perihelion",
    });
  }

  /** Builds the Samhain event. */
  buildSamhainEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Samhain",
      summary: "🎃 Samhain",
    });
  }

  /** Builds the seventh hexadecan event. */
  buildSeventhHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Seventh Hexadecan",
      summary: "🎑 Seventh Hexadecan",
    });
  }

  /** Builds the summer solstice event. */
  buildSummerSolsticeEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Summer Solstice",
      summary: "🌞 Summer Solstice",
    });
  }

  /** Builds the third hexadecan event. */
  buildThirdHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Third Hexadecan",
      summary: "🌻 Third Hexadecan",
    });
  }

  /** Builds the thirteenth hexadecan event. */
  buildThirteenthHexadecanEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Thirteenth Hexadecan",
      summary: "❄️ Thirteenth Hexadecan",
    });
  }

  /** Builds the vernal equinox event. */
  buildVernalEquinoxEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Vernal Equinox",
      summary: "🌸 Vernal Equinox",
    });
  }

  /** Builds the winter solstice event. */
  buildWinterSolsticeEvent(date: Moment): Event {
    return this.buildSolarCycleEvent({
      categories: ANNUAL_SOLAR_CYCLE_BASE_CATEGORIES,
      date,
      description: "Winter Solstice",
      summary: "☃️ Winter Solstice",
    });
  }

  /** Returns all events from the autumn-to-winter half of the solar cycle. */
  getAutumnalToVernalEvents(
    longitudes: SolarCycleLongitudes,
    date: Moment,
  ): Event[] {
    return [
      ...this.getAutumnEvents(longitudes, date),
      ...this.getWinterEvents(longitudes, date),
    ];
  }

  /** Returns all events from the spring-to-autumn half of the solar cycle. */
  getVernalToAutumnalEvents(
    longitudes: SolarCycleLongitudes,
    date: Moment,
  ): Event[] {
    return [
      ...this.getSpringEvents(longitudes, date),
      ...this.getSummerEvents(longitudes, date),
    ];
  }

  /** Returns whether the Sun crossed the autumnal equinox threshold. */
  isAutumnalEquinox(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.autumnalEquinox,
    );
  }

  /** Returns whether the Sun crossed the Beltane threshold. */
  isBeltane(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.beltane,
    );
  }

  /** Returns whether the Sun crossed the eleventh hexadecan threshold. */
  isEleventhHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.eleventhHexadecan,
    );
  }

  /** Returns whether the Sun crossed the fifteenth hexadecan threshold. */
  isFifteenthHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.fifteenthHexadecan,
    );
  }

  /** Returns whether the Sun crossed the fifth hexadecan threshold. */
  isFifthHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.fifthHexadecan,
    );
  }

  /** Returns whether the Sun crossed the first hexadecan threshold. */
  isFirstHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.firstHexadecan,
    );
  }

  /** Returns whether the Sun crossed the Imbolc threshold. */
  isImbolc(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.imbolc,
    );
  }

  /** Returns whether the Sun crossed the Lammas threshold. */
  isLammas(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.lammas,
    );
  }

  /** Returns whether the Sun crossed the ninth hexadecan threshold. */
  isNinthHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.ninthHexadecan,
    );
  }

  /** Returns whether the Sun crossed the Samhain threshold. */
  isSamhain(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.samhain,
    );
  }

  /** Returns whether the Sun crossed the seventh hexadecan threshold. */
  isSeventhHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.seventhHexadecan,
    );
  }

  /** Returns whether the Sun crossed the summer solstice threshold. */
  isSummerSolstice(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.summerSolstice,
    );
  }

  /** Returns whether the Sun crossed the third hexadecan threshold. */
  isThirdHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.thirdHexadecan,
    );
  }

  /** Returns whether the Sun crossed the thirteenth hexadecan threshold. */
  isThirteenthHexadecan(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.thirteenthHexadecan,
    );
  }

  /** Returns whether the Sun crossed the vernal equinox threshold. */
  isVernalEquinox(args: SolarCycleLongitudes): boolean {
    const { currentLongitude, previousLongitude } = args;
    return currentLongitude < 180 && previousLongitude > 180;
  }

  /** Returns whether the Sun crossed the winter solstice threshold. */
  isWinterSolstice(args: SolarCycleLongitudes): boolean {
    return this.hasCrossedSolarLongitude(
      args,
      SOLAR_CYCLE_LONGITUDE_THRESHOLDS.winterSolstice,
    );
  }
}
