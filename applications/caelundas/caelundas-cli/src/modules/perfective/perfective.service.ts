import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { AnnualSolarCycleService } from "../annual-solar-cycle/annual-solar-cycle.service";
import { AspectsService } from "../aspects/aspects.service";
import { MARGIN_MINUTES } from "../caelundas/caelundas.constants";
import { DailyCyclesService } from "../daily-cycles/daily-cycles.service";
import { DatetimeService } from "../datetime/datetime.service";
import { EclipsesService } from "../eclipses/eclipses.service";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { IngressesService } from "../ingresses/ingresses.service";
import { MonthlyLunarCycleService } from "../monthly-lunar-cycle/monthly-lunar-cycle.service";
import { PhasesService } from "../phases/phases.service";
import { RetrogradesService } from "../retrogrades/retrogrades.service";
import { TwilightsService } from "../twilights/twilights.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";
import type { Coordinates, Ephemerides } from "../ephemeris/ephemeris.types";
import type { Input } from "../input/input.types";
import type { Moment } from "moment-timezone";

/**
 * Orchestrates minute-by-minute detection of all astronomical events for a date range.
 *
 * Computes ephemerides day-by-day and delegates to specialized services to identify
 * aspects, eclipses, retrogrades, ingresses, daily cycles, lunar phases,
 * annual solar cycle events, and twilight transitions.
 */
@Injectable()
export class PerfectiveService {
  // 🏗 Dependency Injection

  constructor(
    private readonly datetimeService: DatetimeService,
    private readonly ephemerisService: EphemerisService,
    private readonly aspectsService: AspectsService,
    private readonly eclipsesService: EclipsesService,
    private readonly retrogradesService: RetrogradesService,
    private readonly ingressesService: IngressesService,
    private readonly dailyCyclesService: DailyCyclesService,
    private readonly monthlyLunarCycleService: MonthlyLunarCycleService,
    private readonly annualSolarCycleService: AnnualSolarCycleService,
    private readonly twilightsService: TwilightsService,
    private readonly phasesService: PhasesService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PerfectiveService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Sweeps one day minute-by-minute, aggregating perfective events and rolling aspect state forward. */
  private detectDayEvents(args: {
    coordinates: Coordinates;
    date: Moment;
    previousAspectBodies: AspectBodies[];
    timezone: string;
  }): { events: Event[]; previousAspectBodies: AspectBodies[] } {
    const {
      coordinates,
      date,
      previousAspectBodies: initialAspectBodies,
      timezone,
    } = args;
    let previousAspectBodies = initialAspectBodies;
    const startOfDay = date.clone().startOf("day");
    const endOfDay = date.clone().endOf("day");
    const ephemerides = this.ephemerisService.getEphemerides({
      coordinates,
      end: endOfDay.clone().add(MARGIN_MINUTES, "minutes"),
      start: startOfDay.clone().subtract(MARGIN_MINUTES, "minutes"),
      timezone,
    });
    const events: Event[] = [];
    for (const minute of this.datetimeService.generateMinutes(
      startOfDay,
      endOfDay,
    )) {
      const result = this.detectMinuteEvents(
        minute,
        ephemerides,
        previousAspectBodies,
      );
      previousAspectBodies = result.aspectBodies;
      events.push(...result.events);
    }
    return { events, previousAspectBodies };
  }

  /** Detects all minute-level event families and returns both events and updated aspect-body state. */
  private detectMinuteEvents(
    minute: Moment,
    ephemerides: Ephemerides,
    previousAspectBodies: AspectBodies[],
  ): { aspectBodies: AspectBodies[]; events: Event[] } {
    const { coordinateEphemerisByBody } = ephemerides;
    const { aspectBodies, events: aspectEvents } = this.aspectsService.detect({
      coordinateEphemerisByBody,
      minute,
      previousAspectBodies,
    });
    const events: Event[] = [
      ...aspectEvents,
      ...this.detectObservationalEvents(minute, ephemerides),
      ...this.detectOrbitalEvents(minute, ephemerides),
    ];
    return { aspectBodies, events };
  }

  /** Detects local observational phenomena such as eclipses, crossings, twilights, and rises/sets. */
  private detectObservationalEvents(
    minute: Moment,
    ephemerides: Ephemerides,
  ): Event[] {
    const {
      azimuthElevationEphemerisByBody,
      coordinateEphemerisByBody,
      diameterEphemerisByBody,
    } = ephemerides;
    return [
      ...this.eclipsesService.detect({
        minute,
        moonAzimuthElevationEphemeris: azimuthElevationEphemerisByBody.moon,
        moonCoordinateEphemeris: coordinateEphemerisByBody.moon,
        moonDiameterEphemeris: diameterEphemerisByBody.moon,
        sunAzimuthElevationEphemeris: azimuthElevationEphemerisByBody.sun,
        sunCoordinateEphemeris: coordinateEphemerisByBody.sun,
        sunDiameterEphemeris: diameterEphemerisByBody.sun,
      }),
      ...this.dailyCyclesService.detect({
        minute,
        moonAzimuthElevationEphemeris: azimuthElevationEphemerisByBody.moon,
        sunAzimuthElevationEphemeris: azimuthElevationEphemerisByBody.sun,
      }),
      ...this.twilightsService.detect({
        minute,
        sunAzimuthElevationEphemeris: azimuthElevationEphemerisByBody.sun,
      }),
    ];
  }

  /** Detects orbital-state events such as retrogrades, ingresses, lunar phases, and annual markers. */
  private detectOrbitalEvents(
    minute: Moment,
    ephemerides: Ephemerides,
  ): Event[] {
    const {
      coordinateEphemerisByBody,
      distanceEphemerisByBody,
      illuminationEphemerisByBody,
    } = ephemerides;
    return [
      ...this.retrogradesService.detect({ coordinateEphemerisByBody, minute }),
      ...this.ingressesService.detect({ coordinateEphemerisByBody, minute }),
      ...this.monthlyLunarCycleService.detect({
        minute,
        moonIlluminationEphemeris: illuminationEphemerisByBody.moon,
      }),
      ...this.annualSolarCycleService.detect({
        minute,
        sunCoordinateEphemeris: coordinateEphemerisByBody.sun,
        sunDistanceEphemeris: distanceEphemerisByBody.sun,
      }),
      ...this.phasesService.getMartianPhaseEvents({
        marsCoordinateEphemeris: coordinateEphemerisByBody.mars,
        marsDistanceEphemeris: distanceEphemerisByBody.mars,
        marsIlluminationEphemeris: illuminationEphemerisByBody.mars,
        minute,
        sunCoordinateEphemeris: coordinateEphemerisByBody.sun,
      }),
      ...this.phasesService.getMercurianPhaseEvents({
        mercuryCoordinateEphemeris: coordinateEphemerisByBody.mercury,
        mercuryDistanceEphemeris: distanceEphemerisByBody.mercury,
        mercuryIlluminationEphemeris: illuminationEphemerisByBody.mercury,
        minute,
        sunCoordinateEphemeris: coordinateEphemerisByBody.sun,
      }),
      ...this.phasesService.getVenusianPhaseEvents({
        minute,
        sunCoordinateEphemeris: coordinateEphemerisByBody.sun,
        venusCoordinateEphemeris: coordinateEphemerisByBody.venus,
        venusDistanceEphemeris: distanceEphemerisByBody.venus,
        venusIlluminationEphemeris: illuminationEphemerisByBody.venus,
      }),
    ];
  }

  // 🌎 Public Methods

  /**
   * Detects all perfective (instantaneous) astronomical events within the given date range.
   *
   * Iterates day-by-day, computes per-day ephemerides, then scans minute-by-minute
   * to identify aspects, eclipses, retrogrades, ingresses, daily solar/lunar cycle events,
   * monthly lunar phases, annual solar cycle events, and twilight transitions.
   */
  detect(input: Input): Event[] {
    const { end, latitude, longitude, start, timezone } = input;
    const coordinates: Coordinates = [longitude, latitude];
    let previousAspectBodies: AspectBodies[] = [];
    const perfectiveEvents: Event[] = [];
    for (const date of this.datetimeService.generateDates(
      start,
      end,
      timezone,
    )) {
      const result = this.detectDayEvents({
        coordinates,
        date,
        previousAspectBodies,
        timezone,
      });
      previousAspectBodies = result.previousAspectBodies;
      perfectiveEvents.push(...result.events);
    }
    this.logger.info("🔭 Finished a perfective sweep", undefined, {
      events: perfectiveEvents.length,
    });
    return perfectiveEvents;
  }
}
