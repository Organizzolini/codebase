import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import {
  aspectBodies as minorAspectBodies,
  minorAspects,
} from "../caelundas/caelundas.constants";

import { MinorAspectsEventService } from "./minor-aspects-event.service";
import { MinorAspectsProgressiveService } from "./minor-aspects-progressive.service";

import type {
  AspectPhase,
  Body,
  MinorAspect,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { DetectBodyPairAspectArguments } from "./minor-aspects.types";
import type { Moment } from "moment-timezone";

/**
 * Detects and formats minor aspect events between celestial bodies.
 *
 * Covers semi-sextile (30°), semi-square (45°), sesquiquadrate (135°), and quincunx (150°)
 * using smaller orbs than major aspects. Includes progressive event pairing for
 * duration-aware tracking.
 *
 * @see {@link AspectsUtilitiesService} for orb and angle configuration
 */
@Injectable()
export class MinorAspectsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    aspectsUtilitiesService: AspectsUtilitiesService,
    private readonly minorAspectsEventService: MinorAspectsEventService,
    private readonly minorAspectsProgressiveService: MinorAspectsProgressiveService,
  ) {
    this.logger.setContext(MinorAspectsService.name);
    this.detectAspectPhase = aspectsUtilitiesService.getIsAspect([
      ...minorAspects,
    ]);
  }

  // 🔐 Private Fields

  private readonly detectAspectPhase: ReturnType<
    AspectsUtilitiesService["getIsAspect"]
  >;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Detects a minor-aspect event for one body pair at a specific minute window. */
  private detectBodyPairAspect(
    args: DetectBodyPairAspectArguments,
  ): Event | null {
    const {
      body1,
      body2,
      coordinateEphemerisByBody,
      minute,
      nextMinute,
      previousMinute,
    } = args;
    const body1LongitudesWindow =
      this.minorAspectsEventService.getLongitudesWindowForBody({
        body: body1,
        coordinateEphemerisByBody,
        minute,
        nextMinute,
        previousMinute,
      });
    const body2LongitudesWindow =
      this.minorAspectsEventService.getLongitudesWindowForBody({
        body: body2,
        coordinateEphemerisByBody,
        minute,
        nextMinute,
        previousMinute,
      });
    const phase = this.detectPhaseFromWindows(
      body1LongitudesWindow,
      body2LongitudesWindow,
    );
    if (!phase) {
      return null;
    }
    return this.buildMinorAspectEvent({
      body1,
      body2,
      longitudeBody1: body1LongitudesWindow.current,
      longitudeBody2: body2LongitudesWindow.current,
      phase,
      timestamp: minute,
    });
  }

  /** Derives minor-aspect phase by comparing three-minute longitude windows for both bodies. */
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

  // 🌎 Public Methods

  /**
   * Creates a calendar event for a specific minor aspect occurrence.
   *
   * Formats the event with appropriate emoji indicators, body symbols,
   * and categorization for filtering and organization.
   *
   * @see {@link getMinorAspect} for aspect type determination
   */
  buildMinorAspectEvent(args: {
    body1: Body;
    body2: Body;
    longitudeBody1: number;
    longitudeBody2: number;
    phase: AspectPhase;
    timestamp: Moment;
  }): Event {
    const { body1, body2, longitudeBody1, longitudeBody2, phase, timestamp } =
      args;
    const minorAspect = this.getMinorAspect({ longitudeBody1, longitudeBody2 });
    if (!minorAspect) {
      this.logger.error("📐 Missing minor aspect", undefined, {
        at: timestamp.toISOString(),
        body1,
        body2,
        longitudeBody1,
        longitudeBody2,
      });
      throw new Error("No minor aspect found");
    }
    return this.minorAspectsEventService.assembleMinorAspectEvent({
      body1,
      body2,
      minorAspect,
      phase,
      timestamp,
    });
  }

  /**
   * Detects minor aspect events within a single minute time window.
   *
   * Scans all configured body pairs for minor aspects (semi-sextile 30°,
   * semi-square 45°, sesquiquadrate 135°, quincunx 150°) and determines
   * the phase (forming, exact, or dissolving) based on comparison with
   * adjacent minutes.
   *
   * Minor aspects are weaker harmonic relationships that add nuance to
   * astrological interpretations. They use smaller orbs than major aspects
   * (typically ±2-3° vs ±8-10°).
   *
   * @see {@link getMinorAspect} for aspect type detection
   * @see {@link getMinorAspectPhase} for phase determination
   * @see {@link minorAspectBodies} for configured body list
   */
  detect(args: {
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
  }): Event[] {
    return AspectsUtilitiesService.scanUniqueBodyPairsAtMinute({
      bodies: minorAspectBodies,
      coordinateEphemerisByBody: args.coordinateEphemerisByBody,
      detect: (argumentsObject) => this.detectBodyPairAspect(argumentsObject),
      minute: args.minute,
    });
  }

  /**
   * Converts instantaneous minor aspect events into progressive events.
   *
   * Pairs forming and dissolving events for the same body-aspect combination
   * to create events spanning the entire active period of each aspect.
   * Progressive events show when an aspect is in orb rather than just boundary moments.
   *
   * @see {@link pairProgressiveEvents} for forming/dissolving pairing logic
   */
  detectProgressive(events: Event[]): Event[] {
    return this.minorAspectsProgressiveService.detectProgressive(events);
  }

  /**
   * Returns the first minor aspect between two bodies, or `null` if none is within orb.
   *
   */
  getMinorAspect(args: {
    longitudeBody1: number;
    longitudeBody2: number;
  }): MinorAspect | null {
    return this.minorAspectsEventService.getMinorAspect(args);
  }

  /**
   * Classifies the minor aspect phase (forming / perfective / dissolving) between two bodies
   * across three consecutive minutes, or `null` if no minor aspect is in progress.
   *
   */
  getMinorAspectPhase(args: {
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
