import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { EclipseCalculationService } from "./eclipse-calculation.service";
import { EclipseEventService } from "./eclipse-event.service";

import type { EclipsePhase } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DiameterEphemeris,
} from "../ephemeris/ephemeris.types";
import type { EclipseFrame } from "./eclipses.types";
import type { Moment } from "moment-timezone";

/**
 * Orchestrates solar and lunar eclipse detection and event generation.
 */
@Injectable()
export class EclipsesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly eclipseCalculationService: EclipseCalculationService,
    private readonly eclipseEventService: EclipseEventService,
  ) {
    this.logger.setContext(EclipsesService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Creates a lunar eclipse calendar event.
   */
  buildLunarEclipseEvent(args: {
    date: Moment;
    frame: EclipseFrame;
    phase: EclipsePhase;
  }): Event {
    return this.eclipseEventService.buildLunarEclipseEvent(args);
  }

  /**
   * Creates a solar eclipse calendar event.
   */
  buildSolarEclipseEvent(args: {
    date: Moment;
    frame: EclipseFrame;
    phase: EclipsePhase;
  }): Event {
    return this.eclipseEventService.buildSolarEclipseEvent(args);
  }

  /**
   * Detects solar and lunar eclipse events at a specific minute.
   */
  detect(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris?: AzimuthElevationEphemeris;
    moonCoordinateEphemeris: CoordinateEphemeris;
    moonDiameterEphemeris: DiameterEphemeris;
    sunAzimuthElevationEphemeris?: AzimuthElevationEphemeris;
    sunCoordinateEphemeris: CoordinateEphemeris;
    sunDiameterEphemeris: DiameterEphemeris;
  }): Event[] {
    const coordinates = this.eclipseCalculationService.getAllEclipseCoordinates(
      {
        minute: args.minute,
        moonCoordinateEphemeris: args.moonCoordinateEphemeris,
        moonDiameterEphemeris: args.moonDiameterEphemeris,
        sunCoordinateEphemeris: args.sunCoordinateEphemeris,
        sunDiameterEphemeris: args.sunDiameterEphemeris,
      },
    );

    const geocentricResult = this.eclipseCalculationService.getGeocentricEvents(
      {
        minute: args.minute,
        ...coordinates,
      },
    );

    const eclipseEvents: Event[] = [...geocentricResult.events];

    if (
      args.moonAzimuthElevationEphemeris &&
      args.sunAzimuthElevationEphemeris
    ) {
      eclipseEvents.push(
        ...this.eclipseCalculationService.getTopocentricEventsForDetect({
          coordinates,
          geocentricPhases: {
            lunarPhase: geocentricResult.lunarPhase,
            solarPhase: geocentricResult.solarPhase,
          },
          minute: args.minute,
          moonAzimuthElevationEphemeris: args.moonAzimuthElevationEphemeris,
          sunAzimuthElevationEphemeris: args.sunAzimuthElevationEphemeris,
        }),
      );
    }

    this.logger.debug("🔍 Detected eclipse events", undefined, {
      count: eclipseEvents.length,
    });

    return eclipseEvents;
  }

  /**
   * Builds progressive event spans for eclipse periods.
   */
  detectProgressive(events: Event[]): Event[] {
    const progressiveEvents =
      this.eclipseEventService.detectProgressive(events);

    this.logger.debug("🔍 Detected progressive eclipse events", undefined, {
      count: progressiveEvents.length,
    });

    return progressiveEvents;
  }
}
