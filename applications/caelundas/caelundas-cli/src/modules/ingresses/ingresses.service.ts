import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  ingressBodies as decanIngressBodies,
  ingressBodies as peakIngressBodies,
  ingressBodies as signIngressBodies,
} from "../caelundas/caelundas.constants";
import { objectEntries } from "../caelundas/caelundas.types";

import { IngressesComposerService } from "./ingresses-composer.service";

import type { Body, Sign } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Detects zodiacal ingress events for celestial bodies entering new signs, decans, or sign peaks.
 *
 * Monitors ecliptic longitudes of tracked bodies to identify sign ingresses (every 30°),
 * decan ingresses (every 10°), and peak ingresses (maximum longitude within a sign).
 */
@Injectable()
export class IngressesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly ingressesComposerService: IngressesComposerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(IngressesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  /**
   * Maps each zodiac sign to its ecliptic longitude range.
   *
   * The ecliptic is divided into 12 equal 30° segments, starting with Aries at 0°.
   *
   * @remarks
   * Tropical zodiac (aligned with seasons, not constellations)
   */
  static readonly degreeRangeBySign: Record<
    Sign,
    { maximum: number; minimum: number }
  > = {
    aquarius: { maximum: 330, minimum: 300 },
    aries: { maximum: 30, minimum: 0 },
    cancer: { maximum: 120, minimum: 90 },
    capricorn: { maximum: 300, minimum: 270 },
    gemini: { maximum: 90, minimum: 60 },
    leo: { maximum: 150, minimum: 120 },
    libra: { maximum: 210, minimum: 180 },
    pisces: { maximum: 360, minimum: 330 },
    sagittarius: { maximum: 270, minimum: 240 },
    scorpio: { maximum: 240, minimum: 210 },
    taurus: { maximum: 60, minimum: 30 },
    virgo: { maximum: 180, minimum: 150 },
  };

  /**
   * Determines which zodiac sign corresponds to an ecliptic longitude.
   *
   * @throws If longitude is outside valid range.
   * @see {@link IngressesService.degreeRangeBySign} for sign boundaries
   */
  static getSign(longitude: number): Sign {
    const signDegreeRangeEntry = objectEntries(
      IngressesService.degreeRangeBySign,
    ).find(([, { maximum, minimum }]) => {
      return longitude >= minimum && longitude < maximum;
    });
    if (!signDegreeRangeEntry) {
      throw new Error(`🚫 Longitude ${longitude} not in any sign.`);
    }
    return signDegreeRangeEntry[0];
  }

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Delegates decan-ingress event construction to the composer service.
   */
  buildDecanIngressEvent(args: {
    body: Body;
    date: Moment;
    longitude: number;
  }): Event {
    return this.ingressesComposerService.buildDecanIngressEvent(args);
  }

  /**
   * Creates a sign peak ingress calendar event.
   *
   * Marks when a celestial body reaches the 15° midpoint of its current zodiac sign,
   * representing the peak expression of that sign's energy.
   *
   */
  buildPeakIngressEvent(args: {
    body: Body;
    date: Moment;
    longitude: number;
  }): Event {
    return this.ingressesComposerService.buildPeakIngressEvent(args);
  }

  /**
   * Creates a zodiac sign ingress calendar event.
   *
   * @see {@link getSign} to derive sign from longitude
   */
  buildSignIngressEvent(args: {
    body: Body;
    date: Moment;
    longitude: number;
  }): Event {
    return this.ingressesComposerService.buildSignIngressEvent(args);
  }

  /**
   * Detects all ingress events (sign, decan, peak) at a specific minute.
   *
   */
  detect(args: {
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
  }): Event[] {
    const events = [
      ...this.getSignIngressEvents(args),
      ...this.getDecanIngressEvents(args),
      ...this.getPeakIngressEvents(args),
    ];
    this.logger.debug("🔍 Detected ingress events", undefined, {
      count: events.length,
    });
    return events;
  }

  /**
   * Builds progressive event spans for zodiac sign ingress periods.
   *
   * Pairs consecutive sign ingress events for each body to produce duration-based
   * calendar entries representing the full transit through each zodiac sign.
   *
   */
  detectProgressive(events: Event[]): Event[] {
    const progressiveEvents: Event[] = [];

    const signIngressEvents =
      this.ingressesComposerService.filterSignIngressEvents(events);
    const groupedByBody =
      this.ingressesComposerService.groupSignIngressEventsByBody(
        signIngressEvents,
      );

    for (const [bodyCapitalized, bodyIngresses] of Object.entries(
      groupedByBody,
    )) {
      if (!bodyCapitalized) {
        continue;
      }

      progressiveEvents.push(
        ...this.ingressesComposerService.buildProgressiveSpansForBody(
          bodyCapitalized,
          bodyIngresses,
        ),
      );
    }

    this.logger.debug("🔍 Detected progressive ingress events", undefined, {
      count: progressiveEvents.length,
    });

    return progressiveEvents;
  }

  /**
   * Detects decan ingress events for celestial bodies.
   *
   * A decan ingress occurs when a body crosses into a new decan (10° subdivision
   * within a sign). Each sign has three decans. Excludes sign boundary crossings
   * (which are sign ingresses, not decan ingresses).
   *
   * @see {@link isDecanIngress} for crossing detection
   * @see {@link getDecan} for decan number (1-3) determination
   */
  getDecanIngressEvents(args: {
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
  }): Event[] {
    const { coordinateEphemerisByBody, minute } = args;

    const previousMinute = minute.clone().subtract(1, "minute");

    const decanIngressEvents: Event[] = [];

    for (const body of decanIngressBodies) {
      const coordinateEphemeris = coordinateEphemerisByBody[body];

      const { currentLongitude, previousLongitude } =
        this.ingressesComposerService.getLongitudes({
          coordinateEphemeris,
          minute,
          previousMinute,
        });

      if (Number.isNaN(currentLongitude) || Number.isNaN(previousLongitude)) {
        continue;
      }

      const date = minute;
      const longitude = currentLongitude;

      if (
        !this.ingressesComposerService.isSignIngress({
          currentLongitude,
          previousLongitude,
        }) &&
        this.ingressesComposerService.isDecanIngress({
          currentLongitude,
          previousLongitude,
        })
      ) {
        decanIngressEvents.push(
          this.ingressesComposerService.buildDecanIngressEvent({
            body,
            date,
            longitude,
          }),
        );
      }
    }

    return decanIngressEvents;
  }

  /**
   * Detects sign peak ingress events for celestial bodies at a specific minute.
   *
   * A peak ingress occurs when a body reaches the midpoint longitude (15°) of its
   * current zodiac sign, representing the peak expression of that sign's energy.
   *
   */
  getPeakIngressEvents(args: {
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
  }): Event[] {
    const { coordinateEphemerisByBody, minute } = args;

    const previousMinute = minute.clone().subtract(1, "minute");

    const peakIngressEvents: Event[] = [];

    for (const body of peakIngressBodies) {
      const coordinateEphemeris = coordinateEphemerisByBody[body];

      const { currentLongitude, previousLongitude } =
        this.ingressesComposerService.getLongitudes({
          coordinateEphemeris,
          minute,
          previousMinute,
        });

      if (Number.isNaN(currentLongitude) || Number.isNaN(previousLongitude)) {
        continue;
      }

      const date = minute;
      const longitude = currentLongitude;

      if (
        this.ingressesComposerService.isPeakIngress({
          currentLongitude,
          previousLongitude,
        })
      ) {
        peakIngressEvents.push(
          this.ingressesComposerService.buildPeakIngressEvent({
            body,
            date,
            longitude,
          }),
        );
      }
    }

    return peakIngressEvents;
  }

  /**
   * Detects zodiacal sign ingress events for celestial bodies.
   *
   * A sign ingress occurs when a body crosses from one zodiac sign into the next
   * (every 30° of ecliptic longitude). Monitors all configured bodies and generates
   * events when they cross sign boundaries.
   *
   * @see {@link isSignIngress} for crossing detection
   * @see {@link getSign} for sign determination
   * @see {@link signIngressBodies} for list of tracked bodies
   */
  getSignIngressEvents(args: {
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
  }): Event[] {
    const { coordinateEphemerisByBody, minute } = args;

    const previousMinute = minute.clone().subtract(1, "minute");

    const signIngressEvents: Event[] = [];

    for (const body of signIngressBodies) {
      const coordinateEphemeris = coordinateEphemerisByBody[body];

      const { currentLongitude, previousLongitude } =
        this.ingressesComposerService.getLongitudes({
          coordinateEphemeris,
          minute,
          previousMinute,
        });

      if (Number.isNaN(currentLongitude) || Number.isNaN(previousLongitude)) {
        continue;
      }

      const date = minute;
      const longitude = currentLongitude;

      if (
        this.ingressesComposerService.isSignIngress({
          currentLongitude,
          previousLongitude,
        })
      ) {
        signIngressEvents.push(
          this.ingressesComposerService.buildSignIngressEvent({
            body,
            date,
            longitude,
          }),
        );
      }
    }

    return signIngressEvents;
  }
}
