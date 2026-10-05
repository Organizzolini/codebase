import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import type { EclipsePhase } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { EclipseFrame } from "./eclipses.types";
import type { Moment } from "moment-timezone";

/**
 * Builds eclipse calendar events and progressive duration events.
 */
@Injectable()
export class EclipseEventService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly progressiveUtilitiesService: ProgressiveUtilitiesService,
  ) {
    this.logger.setContext(EclipseEventService.name);
  }

  // 🔐 Private Fields

  private readonly categories = ["Astronomy", "Astrology", "Eclipse"];

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds eclipse event.
   */
  private buildEclipseEvent(args: {
    body: "Lunar" | "Solar";
    date: Moment;
    description: string;
    frame: EclipseFrame;
    summary: string;
  }): Event {
    const { body, date, description, frame, summary } = args;
    const frameLabel =
      frame === "geocentric" ? "Geocentric" : "Topocentric Visibility";
    const frameSymbol = frame === "geocentric" ? "🌐" : "📍";
    const framedDescription = `${description} (${frameLabel})`;
    const framedSummary = `${frameSymbol} ${summary}`;
    const dateString = date.clone().tz("America/New_York").toISOString(true);

    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: dateString,
      summary: framedSummary,
    });

    return {
      categories: [...this.categories, body, frameLabel],
      description: framedDescription,
      end: date,
      start: date,
      summary: framedSummary,
    };
  }

  /**
   * Derives lunar eclipse duration event.
   */
  private getLunarEclipseDurationEvent(
    beginning: Event,
    ending: Event,
    frameLabel: "Geocentric" | "Topocentric Visibility",
  ): Event {
    const frameSymbol = frameLabel === "Geocentric" ? "🌐" : "📍";
    return {
      categories: [...this.categories, "Lunar", frameLabel],
      description: `Lunar Eclipse (${frameLabel})`,
      end: ending.start,
      start: beginning.start,
      summary: `${frameSymbol} 🌙🐉 Lunar Eclipse (${frameLabel})`,
    };
  }

  /**
   * Derives lunar eclipse phase labels.
   */
  private getLunarEclipsePhaseLabels(phase: EclipsePhase): {
    description: string;
    summary: string;
  } {
    if (phase === "maximum") {
      return {
        description: "Lunar Eclipse maximum",
        summary: "🌙🐉🎯 Lunar Eclipse maximum",
      };
    }
    if (phase === "beginning") {
      return {
        description: "Lunar Eclipse begins",
        summary: "🌙🐉▶️ Lunar Eclipse begins",
      };
    }
    return {
      description: "Lunar Eclipse ends",
      summary: "🌙🐉◀️ Lunar Eclipse ends",
    };
  }

  /**
   * Derives progressive frame.
   */
  private getProgressiveEventsForFrame(
    eclipseEvents: Event[],
    frameLabel: "Geocentric" | "Topocentric Visibility",
    body: "Lunar" | "Solar",
  ): Event[] {
    const events = eclipseEvents.filter(
      (event) =>
        event.categories.includes(body) &&
        event.categories.includes(frameLabel),
    );
    const beginnings = events.filter((event) =>
      event.description.includes("begins"),
    );
    const endings = events.filter((event) =>
      event.description.includes("ends"),
    );

    const pairs = this.progressiveUtilitiesService.pairProgressiveEvents(
      beginnings,
      endings,
      `${body.toLowerCase()} eclipse (${frameLabel.toLowerCase()})`,
    );

    return pairs.map(([beginning, ending]) =>
      body === "Solar"
        ? this.getSolarEclipseDurationEvent(beginning, ending, frameLabel)
        : this.getLunarEclipseDurationEvent(beginning, ending, frameLabel),
    );
  }

  /**
   * Derives solar eclipse duration event.
   */
  private getSolarEclipseDurationEvent(
    beginning: Event,
    ending: Event,
    frameLabel: "Geocentric" | "Topocentric Visibility",
  ): Event {
    const frameSymbol = frameLabel === "Geocentric" ? "🌐" : "📍";
    return {
      categories: [...this.categories, "Solar", frameLabel],
      description: `Solar Eclipse (${frameLabel})`,
      end: ending.start,
      start: beginning.start,
      summary: `${frameSymbol} ☀️🐉 Solar Eclipse (${frameLabel})`,
    };
  }

  /**
   * Derives solar eclipse phase labels.
   */
  private getSolarEclipsePhaseLabels(phase: EclipsePhase): {
    description: string;
    summary: string;
  } {
    if (phase === "maximum") {
      return {
        description: "Solar Eclipse maximum",
        summary: "☀️🐉🎯 Solar Eclipse maximum",
      };
    }
    if (phase === "beginning") {
      return {
        description: "Solar Eclipse begins",
        summary: "☀️🐉▶️ Solar Eclipse begins",
      };
    }
    return {
      description: "Solar Eclipse ends",
      summary: "☀️🐉◀️ Solar Eclipse ends",
    };
  }

  // 🌎 Public Methods

  /**
   * Creates a lunar eclipse calendar event.
   */
  buildLunarEclipseEvent(args: {
    date: Moment;
    frame: EclipseFrame;
    phase: EclipsePhase;
  }): Event {
    const { date, frame, phase } = args;
    const { description, summary } = this.getLunarEclipsePhaseLabels(phase);
    return this.buildEclipseEvent({
      body: "Lunar",
      date,
      description,
      frame,
      summary,
    });
  }

  /**
   * Creates a solar eclipse calendar event.
   */
  buildSolarEclipseEvent(args: {
    date: Moment;
    frame: EclipseFrame;
    phase: EclipsePhase;
  }): Event {
    const { date, frame, phase } = args;
    const { description, summary } = this.getSolarEclipsePhaseLabels(phase);
    return this.buildEclipseEvent({
      body: "Solar",
      date,
      description,
      frame,
      summary,
    });
  }

  /**
   * Builds progressive event spans for eclipse periods.
   */
  detectProgressive(events: Event[]): Event[] {
    const eclipseEvents = events.filter((event) =>
      event.categories.includes("Eclipse"),
    );

    return [
      ...this.getProgressiveEventsForFrame(
        eclipseEvents,
        "Geocentric",
        "Lunar",
      ),
      ...this.getProgressiveEventsForFrame(
        eclipseEvents,
        "Geocentric",
        "Solar",
      ),
      ...this.getProgressiveEventsForFrame(
        eclipseEvents,
        "Topocentric Visibility",
        "Lunar",
      ),
      ...this.getProgressiveEventsForFrame(
        eclipseEvents,
        "Topocentric Visibility",
        "Solar",
      ),
    ];
  }
}
