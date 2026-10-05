import { Injectable, Optional } from "@nestjs/common";

import { EphemerisService } from "../ephemeris/ephemeris.service";

import type { AspectPhase, Body } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";
import type { AspectBodies } from "./aspects.types";
import type { Moment } from "moment-timezone";

/**
 * Shared support helpers for aspect detection and phase boundary calculations.
 */
@Injectable()
export class AspectCalculationSupportService {
  // 🏗 Dependency Injection

  constructor(
    @Optional() private readonly ephemerisService?: EphemerisService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Computes a forming or dissolving boundary by comparing pattern existence between consecutive snapshots.
   */
  determineCompoundPhaseFromSnapshots(args: {
    checkPatternExists: (edges: AspectBodies[]) => boolean;
    currentAspectBodies: AspectBodies[];
    currentMinute: Moment;
    patternBodies: Body[];
    previousAspectBodies: AspectBodies[];
  }): null | { eventMinute: Moment; phase: AspectPhase } {
    const {
      checkPatternExists,
      currentAspectBodies,
      currentMinute,
      patternBodies,
      previousAspectBodies,
    } = args;
    const bodySet = new Set(patternBodies);
    const filterByBodies = (edges: AspectBodies[]): AspectBodies[] =>
      edges.filter(
        (edge) => bodySet.has(edge.bodies[0]) && bodySet.has(edge.bodies[1]),
      );

    const currentFiltered = filterByBodies(currentAspectBodies);
    const previousFiltered = filterByBodies(previousAspectBodies);

    const currentExists = checkPatternExists(currentFiltered);
    const previousExists = checkPatternExists(previousFiltered);

    if (currentExists && !previousExists) {
      return { eventMinute: currentMinute, phase: "forming" };
    }

    if (!currentExists && previousExists) {
      return {
        eventMinute: currentMinute.clone().subtract(1, "minute"),
        phase: "dissolving",
      };
    }

    return null;
  }

  /**
   * Returns previous/current/next longitudes for one body from a body-keyed ephemeris map.
   */
  getLongitudesWindowForBody(args: {
    body: Body;
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
    nextMinute: Moment;
    previousMinute: Moment;
  }): { current: number; next: number; previous: number } {
    if (!this.ephemerisService) {
      throw new Error(
        "EphemerisService is required for getLongitudesWindowForBody",
      );
    }

    const {
      body,
      coordinateEphemerisByBody,
      minute,
      nextMinute,
      previousMinute,
    } = args;
    return this.ephemerisService.getLongitudesWindow({
      ephemeris: coordinateEphemerisByBody[body],
      minute,
      next: nextMinute,
      previous: previousMinute,
    });
  }
}
