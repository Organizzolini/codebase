import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { EclipseCalculationService } from "./eclipse-calculation.service";
import { EclipseEventService } from "./eclipse-event.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { EclipsePhase } from "../caelundas/caelundas.types";
import type {
  AzimuthElevationEphemeris,
  CoordinateEphemeris,
  DistanceEphemeris,
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
  }): DetectedCalendarEvent {
    return this.eclipseEventService.buildLunarEclipseEvent(args);
  }

  /**
   * Creates a solar eclipse calendar event.
   */
  buildSolarEclipseEvent(args: {
    date: Moment;
    frame: EclipseFrame;
    phase: EclipsePhase;
  }): DetectedCalendarEvent {
    return this.eclipseEventService.buildSolarEclipseEvent(args);
  }

  /**
   * Detects solar and lunar eclipse events at a specific minute.
   */
  detect(args: {
    minute: Moment;
    moonAzimuthElevationEphemeris?: AzimuthElevationEphemeris;
    moonCoordinateEphemeris: CoordinateEphemeris;
    moonDistanceEphemeris: DistanceEphemeris;
    sunAzimuthElevationEphemeris?: AzimuthElevationEphemeris;
    sunCoordinateEphemeris: CoordinateEphemeris;
    sunDistanceEphemeris: DistanceEphemeris;
  }): DetectedCalendarEvent[] {
    const coordinates = this.eclipseCalculationService.getAllEclipseCoordinates(
      {
        minute: args.minute,
        moonCoordinateEphemeris: args.moonCoordinateEphemeris,
        moonDistanceEphemeris: args.moonDistanceEphemeris,
        sunCoordinateEphemeris: args.sunCoordinateEphemeris,
        sunDistanceEphemeris: args.sunDistanceEphemeris,
      },
    );

    const geocentricResult = this.eclipseCalculationService.getGeocentricEvents(
      {
        minute: args.minute,
        ...coordinates,
      },
    );

    const eclipseEvents: DetectedCalendarEvent[] = [...geocentricResult.events];

    if (
      args.moonAzimuthElevationEphemeris &&
      args.sunAzimuthElevationEphemeris
    ) {
      eclipseEvents.push(
        ...this.eclipseCalculationService.getTopocentricEventsForDetect({
          coordinates,
          geocentricPhases: {
            lunarPhases: geocentricResult.lunarPhases,
            solarPhases: geocentricResult.solarPhases,
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
  detectProgressive(events: DetectedCalendarEvent[]): DetectedCalendarEvent[] {
    const progressiveEvents =
      this.eclipseEventService.detectProgressive(events);

    this.logger.debug("🔍 Detected progressive eclipse events", undefined, {
      count: progressiveEvents.length,
    });

    return progressiveEvents;
  }
}
