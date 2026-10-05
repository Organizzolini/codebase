import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { MathService } from "../math/math.service";

import { TwilightsBuilderService } from "./twilights-builder.service";
import { TwilightsComposerService } from "./twilights-composer.service";
import { TwilightsDetectorService } from "./twilights-detector.service";

import type { Event } from "../calendar/calendar.types";
import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { Twilight } from "./twilights.types";
import type { Moment } from "moment-timezone";

/**
 * Detects solar twilight transition events based on the Sun's elevation angle.
 *
 * Identifies the six daily twilight thresholds (astronomical/nautical/civil dawn and dusk)
 * by comparing the Sun's elevation across consecutive minutes. Also provides progressive
 * event detection for twilight period spans.
 */
@Injectable()
export class TwilightsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly twilightsBuilderService: TwilightsBuilderService,
    private readonly twilightsComposerService: TwilightsComposerService,
    private readonly twilightsDetectorService: TwilightsDetectorService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TwilightsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  static readonly degreesByTwilight: Record<Twilight, number> = {
    astronomical: 18,
    civil: 6,
    nautical: 12,
  };
  static readonly sunRadiusDegrees = 16 / MathService.arcminutesPerDegree;

  static readonly twilights = [
    "civil",
    "nautical",
    "astronomical",
  ] as const satisfies readonly Twilight[];

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Creates an astronomical dawn calendar event.
   * Marks when the sky begins to lighten (Sun at -18° elevation).
   */
  buildAstronomicalDawnEvent(date: Moment): Event {
    return this.twilightsBuilderService.buildAstronomicalDawnEvent(date);
  }

  /**
   * Creates an astronomical dusk calendar event.
   *
   * Marks when the sky is dark enough for astronomical observation (Sun at −18° elevation).
   *
   */
  buildAstronomicalDuskEvent(date: Moment): Event {
    return this.twilightsBuilderService.buildAstronomicalDuskEvent(date);
  }

  /**
   * Creates a civil dawn calendar event.
   *
   * Marks when outdoor activities are possible without artificial light (Sun at −6° elevation).
   *
   */
  buildCivilDawnEvent(date: Moment): Event {
    return this.twilightsBuilderService.buildCivilDawnEvent(date);
  }

  /**
   * Creates a civil dusk calendar event.
   *
   * Marks when artificial light becomes necessary for outdoor activities (Sun at −6° elevation).
   *
   */
  buildCivilDuskEvent(date: Moment): Event {
    return this.twilightsBuilderService.buildCivilDuskEvent(date);
  }

  /**
   * Creates a nautical dawn calendar event.
   *
   * Marks when the horizon becomes visible at sea (Sun at −12° elevation).
   *
   */
  buildNauticalDawnEvent(date: Moment): Event {
    return this.twilightsBuilderService.buildNauticalDawnEvent(date);
  }

  /**
   * Creates a nautical dusk calendar event.
   *
   * Marks when the sea horizon becomes indistinguishable (Sun at −12° elevation).
   *
   */
  buildNauticalDuskEvent(date: Moment): Event {
    return this.twilightsBuilderService.buildNauticalDuskEvent(date);
  }

  /**
   * Detects twilight transition events at a specific minute.
   *
   * Identifies six daily twilight transitions based on solar depression angles:
   * - Astronomical dawn/dusk (18° below horizon)
   * - Nautical dawn/dusk (12° below horizon)
   * - Civil dawn/dusk (6° below horizon).
   *
   * @see {@link isAstronomicalDawn} and related functions for detection
   * @see {@link degreesByTwilight} for threshold definitions
   *
   * @remarks
   * Twilight periods are important for:
   * - Photography (golden hour, blue hour)
   * - Astronomy (observing windows)
   * - Navigation (marine twilight)
   * - Daily rhythm (circadian cycles)
   */
  detect(args: {
    minute: Moment;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): Event[] {
    const { minute, sunAzimuthElevationEphemeris } = args;
    const sunElevationSnapshot = this.twilightsDetectorService.getSunElevations(
      sunAzimuthElevationEphemeris,
      minute,
    );
    const events = this.twilightsDetectorService.buildTwilightTransitionEvents(
      sunElevationSnapshot,
      minute,
    );
    this.logger.debug("🔍 Detected twilight events", undefined, {
      count: events.length,
    });
    return events;
  }

  /**
   * Generates progressive events for twilight periods.
   *
   * Creates span events for six twilight periods plus full night and daylight:
   * - Astronomical twilight (morning/evening)
   * - Nautical twilight (morning/evening)
   * - Daylight (civil dawn to civil dusk)
   * - Night (astronomical dusk to astronomical dawn).
   *
   * @see {@link pairProgressiveEvents} for pairing logic
   */
  detectProgressive(detectedEvents: Event[]): Event[] {
    const twilightCategoryEvents = detectedEvents.filter((event) =>
      event.categories.includes("Twilight"),
    );
    const getEventsByCategory = (categoryName: string): Event[] =>
      twilightCategoryEvents.filter((event) =>
        event.categories.includes(categoryName),
      );

    const astronomicalDawnEvents = getEventsByCategory("Astronomical Dawn");
    const nauticalDawnEvents = getEventsByCategory("Nautical Dawn");
    const civilDawnEvents = getEventsByCategory("Civil Dawn");
    const civilDuskEvents = getEventsByCategory("Civil Dusk");
    const nauticalDuskEvents = getEventsByCategory("Nautical Dusk");
    const astronomicalDuskEvents = getEventsByCategory("Astronomical Dusk");

    const progressiveEvents = [
      ...this.twilightsComposerService.buildDawnProgressiveEvents(
        astronomicalDawnEvents,
        nauticalDawnEvents,
        civilDawnEvents,
      ),
      ...this.twilightsComposerService.buildDuskProgressiveEvents({
        astronomicalDuskEvents,
        civilDawnEvents,
        civilDuskEvents,
        nauticalDuskEvents,
      }),
      ...this.twilightsComposerService.pairAndBuild({
        beginnings: astronomicalDuskEvents,
        builder: (beginning, ending) =>
          this.twilightsBuilderService.getNightDurationEvent(beginning, ending),
        endings: astronomicalDawnEvents,
        label: "Night",
      }),
    ];
    this.logger.debug("🔍 Detected progressive twilight events", undefined, {
      count: progressiveEvents.length,
    });
    return progressiveEvents;
  }
}
