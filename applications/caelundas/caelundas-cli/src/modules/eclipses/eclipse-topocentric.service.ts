import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { EclipsePhase } from "../caelundas/caelundas.types";
import type { AzimuthElevationEphemeris } from "../ephemeris/ephemeris.types";
import type { EclipseCoordinates } from "./eclipses.types";
import type { Moment } from "moment-timezone";

/**
 * Computes topocentric eclipse activity and event transitions.
 */
@Injectable()
export class EclipseTopocentricService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly eclipseGeometryService: EclipseGeometryService,
    private readonly eclipseEventService: EclipseEventService,
  ) {
    this.logger.setContext(EclipseTopocentricService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Creates a topocentric lunar eclipse event when visibility and phase align.
   */
  private getLunarTopocentricEvent(args: {
    currentCoordinates: EclipseCoordinates;
    currentVisible: boolean;
    geocentricPhase: EclipsePhase | null;
    minute: Moment;
    nextCoordinates: EclipseCoordinates;
    nextVisible: boolean;
    previousCoordinates: EclipseCoordinates;
    previousVisible: boolean;
  }): DetectedCalendarEvent | null {
    const phase = this.getTopocentricPhase({
      currentActive: this.isLunarTopocentricActive(
        args.currentCoordinates,
        args.currentVisible,
      ),
      geocentricPhase: args.geocentricPhase,
      nextActive: this.isLunarTopocentricActive(
        args.nextCoordinates,
        args.nextVisible,
      ),
      previousActive: this.isLunarTopocentricActive(
        args.previousCoordinates,
        args.previousVisible,
      ),
    });

    return phase
      ? this.eclipseEventService.buildLunarEclipseEvent({
          date: args.minute,
          frame: "topocentric",
          phase,
        })
      : null;
  }

  /**
   * Creates a topocentric solar eclipse event when visibility and phase align.
   */
  private getSolarTopocentricEvent(args: {
    currentCoordinates: EclipseCoordinates;
    currentVisible: boolean;
    geocentricPhase: EclipsePhase | null;
    minute: Moment;
    nextCoordinates: EclipseCoordinates;
    nextVisible: boolean;
    previousCoordinates: EclipseCoordinates;
    previousVisible: boolean;
  }): DetectedCalendarEvent | null {
    const phase = this.getTopocentricPhase({
      currentActive: this.isSolarTopocentricActive(
        args.currentCoordinates,
        args.currentVisible,
      ),
      geocentricPhase: args.geocentricPhase,
      nextActive: this.isSolarTopocentricActive(
        args.nextCoordinates,
        args.nextVisible,
      ),
      previousActive: this.isSolarTopocentricActive(
        args.previousCoordinates,
        args.previousVisible,
      ),
    });

    return phase
      ? this.eclipseEventService.buildSolarEclipseEvent({
          date: args.minute,
          frame: "topocentric",
          phase,
        })
      : null;
  }

  /**
   * Resolves topocentric phase transitions from active-state edges.
   */
  private getTopocentricPhase(args: {
    currentActive: boolean;
    geocentricPhase: EclipsePhase | null;
    nextActive: boolean;
    previousActive: boolean;
  }): EclipsePhase | null {
    const { currentActive, geocentricPhase, nextActive, previousActive } = args;

    if (!currentActive) {
      return null;
    }

    if (!previousActive) {
      return "beginning";
    }

    if (!nextActive) {
      return "ending";
    }

    if (geocentricPhase === "maximum") {
      return "maximum";
    }

    return null;
  }

  // 🌎 Public Methods

  /**
   * Computes topocentric eclipse events for both solar and lunar branches.
   */
  getTopocentricEvents(args: {
    currentCoordinates: EclipseCoordinates;
    lunarPhase: EclipsePhase | null;
    minute: Moment;
    moonAzimuthElevationEphemeris: AzimuthElevationEphemeris;
    nextCoordinates: EclipseCoordinates;
    previousCoordinates: EclipseCoordinates;
    solarPhase: EclipsePhase | null;
    sunAzimuthElevationEphemeris: AzimuthElevationEphemeris;
  }): DetectedCalendarEvent[] {
    const visibilities =
      this.eclipseGeometryService.getAllTopocentricVisibilities({
        minute: args.minute,
        moonAzimuthElevationEphemeris: args.moonAzimuthElevationEphemeris,
        sunAzimuthElevationEphemeris: args.sunAzimuthElevationEphemeris,
      });

    const events: DetectedCalendarEvent[] = [];

    const solarEvent = this.getSolarTopocentricEvent({
      currentCoordinates: args.currentCoordinates,
      currentVisible: visibilities.currentVisibility.isSolarVisible,
      geocentricPhase: args.solarPhase,
      minute: args.minute,
      nextCoordinates: args.nextCoordinates,
      nextVisible: visibilities.nextVisibility.isSolarVisible,
      previousCoordinates: args.previousCoordinates,
      previousVisible: visibilities.previousVisibility.isSolarVisible,
    });

    if (solarEvent) {
      events.push(solarEvent);
    }

    const lunarEvent = this.getLunarTopocentricEvent({
      currentCoordinates: args.currentCoordinates,
      currentVisible: visibilities.currentVisibility.isLunarVisible,
      geocentricPhase: args.lunarPhase,
      minute: args.minute,
      nextCoordinates: args.nextCoordinates,
      nextVisible: visibilities.nextVisibility.isLunarVisible,
      previousCoordinates: args.previousCoordinates,
      previousVisible: visibilities.previousVisibility.isLunarVisible,
    });

    if (lunarEvent) {
      events.push(lunarEvent);
    }

    return events;
  }

  /**
   * Checks whether a lunar eclipse is in progress geocentrically: the Moon
   * lies inside the penumbral contact distance from the shadow axis.
   */
  isLunarEclipseActive(current: EclipseCoordinates): boolean {
    const { contactLimit, separation } =
      this.eclipseGeometryService.getLunarContactGeometry(current);
    return separation < contactLimit;
  }

  /**
   * Checks whether lunar eclipse is active and visible from observer location.
   */
  isLunarTopocentricActive(
    coordinates: EclipseCoordinates,
    isVisible: boolean,
  ): boolean {
    return this.isLunarEclipseActive(coordinates) && isVisible;
  }

  /**
   * Checks whether a solar eclipse is in progress geocentrically: the Moon's
   * penumbra falls somewhere on Earth.
   */
  isSolarEclipseActive(current: EclipseCoordinates): boolean {
    const { contactLimit, separation } =
      this.eclipseGeometryService.getSolarContactGeometry(current);
    return separation < contactLimit;
  }

  /**
   * Checks whether solar eclipse is active and visible from observer location.
   */
  isSolarTopocentricActive(
    coordinates: EclipseCoordinates,
    isVisible: boolean,
  ): boolean {
    return this.isSolarEclipseActive(coordinates) && isVisible;
  }
}
