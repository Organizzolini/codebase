import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { AspectEphemerisService } from "../aspects/aspect-ephemeris.service";
import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import {
  aspectBodies as majorAspectBodies,
  majorAspects,
} from "../caelundas/caelundas.constants";

import { MajorAspectEventService } from "./major-aspect-event.service";
import { MajorAspectProgressiveService } from "./major-aspect-progressive.service";

import type { AspectPhase, Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { DetectAspectForBodyPairArguments } from "./major-aspects.types";
import type { Moment } from "moment-timezone";

/**
 * Detects and formats major aspect events between celestial bodies.
 *
 * Covers conjunction (0°), sextile (60°), square (90°), trine (120°), and opposition (180°)
 * using an 8° orb tolerance. Includes progressive event pairing for duration-aware tracking.
 *
 * @see {@link AspectsUtilitiesService} for orb and angle configuration
 */
@Injectable()
export class MajorAspectsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly aspectEphemerisService: AspectEphemerisService,
    private readonly aspectsUtilitiesService: AspectsUtilitiesService,
    private readonly majorAspectEventService: MajorAspectEventService,
    private readonly majorAspectProgressiveService: MajorAspectProgressiveService,
  ) {
    this.logger.setContext(MajorAspectsService.name);
    this.detectAspectPhase = this.aspectsUtilitiesService.getIsAspect([
      ...majorAspects,
    ]);
  }

  // 🔐 Private Fields

  private readonly detectAspectPhase: ReturnType<
    AspectsUtilitiesService["getIsAspect"]
  >;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Detects aspect for body pair.
   */
  private detectAspectForBodyPair(
    args: DetectAspectForBodyPairArguments,
  ): Event | null {
    const body1LongitudesWindow = this.getLongitudesWindowForBody({
      body: args.body1,
      coordinateEphemerisByBody: args.coordinateEphemerisByBody,
      minute: args.minute,
      nextMinute: args.nextMinute,
      previousMinute: args.previousMinute,
    });
    const body2LongitudesWindow = this.getLongitudesWindowForBody({
      body: args.body2,
      coordinateEphemerisByBody: args.coordinateEphemerisByBody,
      minute: args.minute,
      nextMinute: args.nextMinute,
      previousMinute: args.previousMinute,
    });
    const phase = this.detectPhaseFromWindows(
      body1LongitudesWindow,
      body2LongitudesWindow,
    );
    if (!phase) return null;
    return this.buildMajorAspectEvent({
      body1: args.body1,
      body2: args.body2,
      longitudeBody1: body1LongitudesWindow.current,
      longitudeBody2: body2LongitudesWindow.current,
      phase,
      timestamp: args.minute,
    });
  }

  /**
   * Detects phase from windows.
   */
  private detectPhaseFromWindows(
    body1LongitudesWindow: { current: number; next: number; previous: number },
    body2LongitudesWindow: { current: number; next: number; previous: number },
  ): AspectPhase | null {
    return AspectsUtilitiesService.detectPhaseFromWindows({
      body1LongitudesWindow,
      body2LongitudesWindow,
      detectAspectPhase: this.detectAspectPhase,
    });
  }

  /**
   * Derives longitudes window for body.
   */
  private getLongitudesWindowForBody(args: {
    body: Body;
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
    nextMinute: Moment;
    previousMinute: Moment;
  }): { current: number; next: number; previous: number } {
    return this.aspectEphemerisService.getLongitudesWindowForBody(args);
  }

  // 🌎 Public Methods

  /**
   * Resolves the active major aspect for two bodies and assembles a typed event.
   * Throws when no major aspect is within orb for the supplied longitudes.
   */
  buildMajorAspectEvent(args: {
    body1: Body;
    body2: Body;
    longitudeBody1: number;
    longitudeBody2: number;
    phase: AspectPhase;
    timestamp: Moment;
  }): Event {
    return this.majorAspectEventService.buildMajorAspectEvent(args);
  }

  /**
   * Scans all unique major-body pairs for a forming/perfective/dissolving event at this minute.
   */
  detect(args: {
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
  }): Event[] {
    return AspectsUtilitiesService.scanUniqueBodyPairsAtMinute({
      bodies: majorAspectBodies,
      coordinateEphemerisByBody: args.coordinateEphemerisByBody,
      detect: (argumentsObject) =>
        this.detectAspectForBodyPair(argumentsObject),
      minute: args.minute,
    });
  }

  /**
   * Builds duration events by pairing forming and dissolving events per body-pair/aspect key.
   */
  detectProgressive(events: Event[]): Event[] {
    return this.majorAspectProgressiveService.detectProgressive(events);
  }

  /**
   * Returns the first major aspect between two bodies, or `null` if none is within orb.
   */
  getMajorAspect(args: {
    longitudeBody1: number;
    longitudeBody2: number;
  }): ReturnType<MajorAspectEventService["getMajorAspect"]> {
    return this.majorAspectEventService.getMajorAspect(args);
  }

  /**
   * Classifies the major aspect phase (forming / perfective / dissolving) between two bodies
   * across three consecutive minutes, or `null` if no major aspect is in progress.
   */
  getMajorAspectPhase(args: {
    currentLongitudeBody1: number;
    currentLongitudeBody2: number;
    nextLongitudeBody1: number;
    nextLongitudeBody2: number;
    previousLongitudeBody1: number;
    previousLongitudeBody2: number;
  }): AspectPhase | null {
    return this.detectAspectPhase(args);
  }
}
