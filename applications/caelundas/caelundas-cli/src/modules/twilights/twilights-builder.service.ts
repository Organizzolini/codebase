import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import type { Event } from "../calendar/calendar.types";
import type { Moment } from "moment-timezone";

/**
 * Builds twilight boundary events and derived interval events from paired transitions.
 */
@Injectable()
export class TwilightsBuilderService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(TwilightsBuilderService.name);
  }

  // 🔐 Private Fields

  private static readonly twilightBaseCategories = [
    "Astronomy",
    "Astrology",
    "Twilight",
  ];

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Creates a timestamped twilight transition event and logs the detected boundary. */
  private buildTransitionEvent(
    date: Moment,
    description: string,
    emoji: string,
  ): Event {
    const summary = `${emoji} ${description}`;
    const dateString = date.clone().tz("America/New_York").toISOString(true);
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: dateString,
      summary,
    });

    return {
      categories: [
        ...TwilightsBuilderService.twilightBaseCategories,
        description,
      ],
      description,
      end: date,
      start: date,
      summary,
    };
  }

  // 🌎 Public Methods

  /**
   * Builds the instant when Sun crosses -18 degrees upward.
   */
  buildAstronomicalDawnEvent(date: Moment): Event {
    return this.buildTransitionEvent(date, "Astronomical Dawn", "🌠");
  }

  /**
   * Builds the instant when Sun crosses -18 degrees downward.
   */
  buildAstronomicalDuskEvent(date: Moment): Event {
    return this.buildTransitionEvent(date, "Astronomical Dusk", "🌌");
  }

  /**
   * Builds the instant when Sun crosses -6 degrees upward.
   */
  buildCivilDawnEvent(date: Moment): Event {
    return this.buildTransitionEvent(date, "Civil Dawn", "🌄");
  }

  /**
   * Builds the instant when Sun crosses -6 degrees downward.
   */
  buildCivilDuskEvent(date: Moment): Event {
    return this.buildTransitionEvent(date, "Civil Dusk", "🌇");
  }

  /**
   * Builds the instant when Sun crosses -12 degrees upward.
   */
  buildNauticalDawnEvent(date: Moment): Event {
    return this.buildTransitionEvent(date, "Nautical Dawn", "🌅");
  }

  /**
   * Builds the instant when Sun crosses -12 degrees downward.
   */
  buildNauticalDuskEvent(date: Moment): Event {
    return this.buildTransitionEvent(date, "Nautical Dusk", "🌉");
  }

  /**
   * Builds evening astronomical-twilight interval from transition boundaries.
   */
  getAstronomicalTwilightEveningDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...TwilightsBuilderService.twilightBaseCategories,
        "Astronomical Twilight",
        "Evening",
      ],
      description: "Astronomical Twilight (Evening)",
      end: ending.start,
      start: beginning.start,
      summary: "🌌 Astronomical Twilight (Evening)",
    };
  }

  /**
   * Builds morning astronomical-twilight interval from transition boundaries.
   */
  getAstronomicalTwilightMorningDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...TwilightsBuilderService.twilightBaseCategories,
        "Astronomical Twilight",
        "Morning",
      ],
      description: "Astronomical Twilight (Morning)",
      end: ending.start,
      start: beginning.start,
      summary: "🌠 Astronomical Twilight (Morning)",
    };
  }

  /**
   * Builds daylight interval between civil dawn and civil dusk boundaries.
   */
  getDaylightDurationEvent(beginning: Event, ending: Event): Event {
    return {
      categories: [
        ...TwilightsBuilderService.twilightBaseCategories,
        "Daylight",
      ],
      description: "Daylight",
      end: ending.start,
      start: beginning.start,
      summary: "☀️ Daylight",
    };
  }

  /**
   * Builds evening nautical-twilight interval from transition boundaries.
   */
  getNauticalTwilightEveningDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...TwilightsBuilderService.twilightBaseCategories,
        "Nautical Twilight",
        "Evening",
      ],
      description: "Nautical Twilight (Evening)",
      end: ending.start,
      start: beginning.start,
      summary: "🌉 Nautical Twilight (Evening)",
    };
  }

  /**
   * Builds morning nautical-twilight interval from transition boundaries.
   */
  getNauticalTwilightMorningDurationEvent(
    beginning: Event,
    ending: Event,
  ): Event {
    return {
      categories: [
        ...TwilightsBuilderService.twilightBaseCategories,
        "Nautical Twilight",
        "Morning",
      ],
      description: "Nautical Twilight (Morning)",
      end: ending.start,
      start: beginning.start,
      summary: "🌅 Nautical Twilight (Morning)",
    };
  }

  /**
   * Builds night interval spanning from astronomical dusk to next astronomical dawn.
   */
  getNightDurationEvent(beginning: Event, ending: Event): Event {
    return {
      categories: [...TwilightsBuilderService.twilightBaseCategories, "Night"],
      description: "Night",
      end: ending.start,
      start: beginning.start,
      summary: "🌃 Night",
    };
  }
}
