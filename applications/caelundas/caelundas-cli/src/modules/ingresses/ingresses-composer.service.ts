import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { LoggerService } from "@codebase/logging";

import {
  ingressBodies as signIngressBodies,
  signs,
} from "../caelundas/caelundas.constants";
import {
  bodyDisplayName,
  bodyFromDisplayName,
  capitalize,
  isDecan,
  isSign,
  objectEntries,
} from "../caelundas/caelundas.types";
import {
  symbolByBody,
  symbolByDecan,
  symbolBySign,
} from "../caelundas/symbol-caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Body, Decan, Sign } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/** Event building and ingress detection helpers for {@link IngressesService}. */
@Injectable()
export class IngressesComposerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly ephemerisService: EphemerisService,
  ) {
    this.logger.setContext(IngressesComposerService.name);
  }

  // 🔐 Private Fields

  private static readonly degreeRangeBySign: Record<
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
  private static readonly ingressBaseCategories = [
    "Astronomy",
    "Astrology",
    "Ingress",
  ];

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Maps an ecliptic longitude to its containing zodiac sign range.
   */
  private static getSign(longitude: number): Sign {
    const signDegreeRangeEntry = objectEntries(
      IngressesComposerService.degreeRangeBySign,
    ).find(([, { maximum, minimum }]) => {
      return longitude >= minimum && longitude < maximum;
    });
    if (!signDegreeRangeEntry) {
      throw new Error(`🚫 Longitude ${longitude} not in any sign.`);
    }
    return signDegreeRangeEntry[0];
  }

  // 🌎 Public Methods

  /**
   * Creates a decan ingress calendar event.
   *
   * A decan ingress occurs when a body crosses into one of the three 10° subdivisions
   * within a zodiac sign, each associated with a sub-ruler and decan symbol.
   *
   */
  buildDecanIngressEvent(args: {
    body: Body;
    date: Moment;
    longitude: number;
  }): DetectedCalendarEvent {
    const event = this.buildDecanIngressEventObject(args);
    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: args.date.toISOString(),
      summary: event.summary,
    });
    return event;
  }

  /**
   * Builds the decan ingress payload without logging side effects.
   */
  buildDecanIngressEventObject(args: {
    body: Body;
    date: Moment;
    longitude: number;
  }): DetectedCalendarEvent {
    const { body, date, longitude } = args;
    const sign = IngressesComposerService.getSign(longitude);
    const decan = this.resolveDecan(longitude);
    const bodyCapitalized = bodyDisplayName(body);
    const signCapitalized = capitalize(sign);
    const description = `${bodyCapitalized} ingress decan ${decan} ${signCapitalized}`;
    const summary = `${symbolByBody[body]} → ${symbolBySign[sign]}${symbolByDecan[decan]} ${description}`;
    return {
      categories: [
        ...IngressesComposerService.ingressBaseCategories,
        "Decan",
        bodyCapitalized,
        signCapitalized,
      ],
      description,
      end: date,
      start: date,
      summary,
    };
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
  }): DetectedCalendarEvent {
    const { body, date, longitude } = args;
    const sign = IngressesComposerService.getSign(longitude);
    const bodyCapitalized = bodyDisplayName(body);
    const signCapitalized = capitalize(sign);
    const bodySymbol = symbolByBody[body];
    const signSymbol = symbolBySign[sign];

    const description = `${bodyCapitalized} peak ingress ${signCapitalized}`;
    const summary = `${bodySymbol} → ${signSymbol}⛰️ ${description}`;

    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: date.toISOString(),
      summary,
    });

    const peakIngressEvent: DetectedCalendarEvent = {
      categories: [
        ...IngressesComposerService.ingressBaseCategories,
        "Peak",
        bodyCapitalized,
        signCapitalized,
      ],
      description,
      end: date,
      start: date,
      summary,
    };

    return peakIngressEvent;
  }

  /**
   * Converts ordered sign-ingress instants into contiguous per-sign duration spans.
   */
  buildProgressiveSpansForBody(
    bodyCapitalized: string,
    events: DetectedCalendarEvent[],
  ): DetectedCalendarEvent[] {
    const progressiveSpans: DetectedCalendarEvent[] = [];
    const sortedIngresses = _.sortBy(events, (event) => event.start.valueOf());
    for (let index = 0; index < sortedIngresses.length - 1; index++) {
      const entering = sortedIngresses[index];
      const exiting = sortedIngresses[index + 1];
      if (!entering || !exiting) {
        continue;
      }
      progressiveSpans.push(
        this.getSignIngressDurationEvent(entering, exiting, bodyCapitalized),
      );
    }
    return progressiveSpans;
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
  }): DetectedCalendarEvent {
    const { body, date, longitude } = args;
    const sign = IngressesComposerService.getSign(longitude);
    const bodyCapitalized = bodyDisplayName(body);
    const signCapitalized = _.startCase(sign);
    const bodySymbol = symbolByBody[body];
    const signSymbol = symbolBySign[sign];

    const description = `${bodyCapitalized} ingress ${signCapitalized}`;
    const summary = `${bodySymbol} → ${signSymbol} ${description}`;

    this.logger.info("🗓️ Built a calendar event", undefined, {
      at: date.toISOString(),
      summary,
    });

    const signIngressEvent: DetectedCalendarEvent = {
      categories: [
        ...IngressesComposerService.ingressBaseCategories,
        bodyCapitalized,
        signCapitalized,
      ],
      description,
      end: date,
      start: date,
      summary,
    };

    return signIngressEvent;
  }

  /**
   * Extracts sign and body from categories.
   */
  extractSignAndBodyFromCategories(
    categories: string[],
    bodyCapitalized: string,
  ): {
    body: Body;
    bodyCapitalized: string;
    sign: Sign;
    signCapitalized: string;
  } {
    const signCapitalized = categories.find((category) =>
      signs.map((sign) => _.startCase(sign)).includes(category),
    );
    if (!signCapitalized) {
      throw new Error(
        `Could not extract sign from categories: ${categories.join(", ")}`,
      );
    }
    const bodyFromName = bodyFromDisplayName(bodyCapitalized);
    const signLower = signCapitalized.toLowerCase();
    if (bodyFromName === undefined || !isSign(signLower)) {
      throw new Error(
        `Could not extract typed values from categories: ${categories.join(", ")}`,
      );
    }
    return {
      body: bodyFromName,
      bodyCapitalized,
      sign: signLower,
      signCapitalized,
    };
  }

  /**
   * Keeps only sign-boundary ingress events, excluding decan and peak markers.
   */
  filterSignIngressEvents(
    events: DetectedCalendarEvent[],
  ): DetectedCalendarEvent[] {
    return events.filter(
      (event) =>
        event.categories.includes("Ingress") &&
        !event.categories.includes("Decan") &&
        !event.categories.includes("Peak"),
    );
  }

  /**
   * Maps longitude to decan number (1-3) relative to the current sign start degree.
   */
  getDecan(longitude: number): number {
    const sign = IngressesComposerService.getSign(longitude);
    const { minimum: minimum } =
      IngressesComposerService.degreeRangeBySign[sign];
    return Math.floor((longitude - minimum) / 10) + 1;
  }

  /**
   * Retrieves current and previous longitudes for minute-boundary ingress checks.
   */
  getLongitudes(args: {
    coordinateEphemeris: CoordinateEphemeris;
    minute: Moment;
    previousMinute: Moment;
  }): { currentLongitude: number; previousLongitude: number } {
    const { coordinateEphemeris, minute, previousMinute } = args;
    const currentLongitude = this.ephemerisService.getCoordinateFromEphemeris(
      coordinateEphemeris,
      minute.toISOString(),
      "longitude",
    );
    const previousLongitude = this.ephemerisService.getCoordinateFromEphemeris(
      coordinateEphemeris,
      previousMinute.toISOString(),
      "longitude",
    );
    return { currentLongitude, previousLongitude };
  }

  /**
   * Builds a progressive sign-stay event from entering and next-sign exit instants.
   */
  getSignIngressDurationEvent(
    entering: DetectedCalendarEvent,
    exiting: DetectedCalendarEvent,
    bodyCapitalized: string,
  ): DetectedCalendarEvent {
    const { body, sign, signCapitalized } =
      this.extractSignAndBodyFromCategories(
        entering.categories,
        bodyCapitalized,
      );
    const bodySymbol = symbolByBody[body];
    const signSymbol = symbolBySign[sign];
    return {
      categories: [
        "Astronomy",
        "Astrology",
        "Ingress",
        bodyCapitalized,
        signCapitalized,
      ],
      description: `${bodyCapitalized} in ${signCapitalized}`,
      end: exiting.start,
      start: entering.start,
      summary: `${bodySymbol} ${signSymbol} ${bodyCapitalized} in ${signCapitalized}`,
    };
  }

  /**
   * Groups sign ingress events by body.
   */
  groupSignIngressEventsByBody(
    events: DetectedCalendarEvent[],
  ): Record<string, DetectedCalendarEvent[]> {
    return _.groupBy(events, (event) => {
      const bodyCapitalized = event.categories.find((category) =>
        signIngressBodies
          .map((signIngressBody) => bodyDisplayName(signIngressBody))
          .includes(category),
      );
      return bodyCapitalized || "";
    });
  }

  /**
   * Returns `true` when the decan index changes between consecutive minutes.
   */
  isDecanIngress(args: {
    currentLongitude: number;
    previousLongitude: number;
  }): boolean {
    const { currentLongitude, previousLongitude } = args;
    return this.getDecan(currentLongitude) !== this.getDecan(previousLongitude);
  }

  /**
   * Returns `true` when longitude crosses the in-sign midpoint threshold (15 degrees),
   * moving forward or backward within a single sign.
   *
   * @remarks
   * A move between two signs is a sign ingress, never a peak, so a body that
   * re-enters a sign backwards (retrograde) does not report a spurious peak.
   */
  isPeakIngress(args: {
    currentLongitude: number;
    previousLongitude: number;
  }): boolean {
    const { currentLongitude, previousLongitude } = args;

    const sign = IngressesComposerService.getSign(currentLongitude);
    if (sign !== IngressesComposerService.getSign(previousLongitude)) {
      return false;
    }

    const { minimum } = IngressesComposerService.degreeRangeBySign[sign];
    const currentIsPastPeak = currentLongitude - minimum >= 15;
    const previousIsPastPeak = previousLongitude - minimum >= 15;

    return currentIsPastPeak !== previousIsPastPeak;
  }

  /**
   * Returns `true` when consecutive longitudes resolve to different zodiac signs.
   */
  isSignIngress(args: {
    currentLongitude: number;
    previousLongitude: number;
  }): boolean {
    const { currentLongitude, previousLongitude } = args;
    return (
      IngressesComposerService.getSign(currentLongitude) !==
      IngressesComposerService.getSign(previousLongitude)
    );
  }

  /**
   * Converts numeric decan to the validated `Decan` union and throws on invalid values.
   */
  resolveDecan(longitude: number): Decan {
    const decanString = String(this.getDecan(longitude));
    if (!isDecan(decanString)) {
      throw new Error(`Invalid decan value: ${decanString}`);
    }
    return decanString;
  }
}
