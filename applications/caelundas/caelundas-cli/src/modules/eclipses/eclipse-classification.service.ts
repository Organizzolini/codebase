import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logging";

import {
  KILOMETERS_PER_ASTRONOMICAL_UNIT,
  radiusKilometersByHorizonBody,
} from "../ephemeris/ephemeris.constants";

import { EclipseGeometryService } from "./eclipse-geometry.service";
import {
  DANJON_SHADOW_ENLARGEMENT,
  DEGREES_PER_RADIAN,
  EARTH_EQUATORIAL_RADIUS_KILOMETERS,
} from "./eclipses.constants";

import type {
  EclipseContactGeometry,
  EclipseCoordinates,
  LunarEclipseType,
  SolarEclipseType,
} from "./eclipses.types";

/**
 * Classifies eclipses by type and finds greatest eclipse, from the
 * geocentric Sun–Moon geometry {@link EclipseGeometryService} samples.
 */
@Injectable()
export class EclipseClassificationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly eclipseGeometryService: EclipseGeometryService,
  ) {
    this.logger.setContext(EclipseClassificationService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The Moon's least separation from `target`, in degrees, if it keeps the
   * motion it has across the window: |p × v| / |v| in the plane tangent to
   * the sky at the target. Over an eclipse's few hours the Moon's path
   * relative to the Sun or the shadow is straight enough to classify it
   * from its very first minute.
   */
  private static getClosestApproach(
    window: {
      current: EclipseCoordinates;
      next: EclipseCoordinates;
      previous: EclipseCoordinates;
    },
    target: (coordinates: EclipseCoordinates) => {
      latitude: number;
      longitude: number;
    },
  ): number {
    const offset = (
      coordinates: EclipseCoordinates,
    ): { east: number; north: number } => {
      const { latitude, longitude } = target(coordinates);
      const longitudeDifference =
        ((((coordinates.longitudeMoon - longitude + 180) % 360) + 360) % 360) -
        180;
      return {
        east: longitudeDifference * Math.cos(latitude / DEGREES_PER_RADIAN),
        north: coordinates.latitudeMoon - latitude,
      };
    };
    const position = offset(window.current);
    const before = offset(window.previous);
    const after = offset(window.next);
    const velocityEast = after.east - before.east;
    const velocityNorth = after.north - before.north;
    const speed = Math.hypot(velocityEast, velocityNorth);
    if (speed === 0) {
      return Math.hypot(position.east, position.north);
    }
    return (
      Math.abs(position.east * velocityNorth - position.north * velocityEast) /
      speed
    );
  }

  /**
   * Distance of the Sun–Moon line (the shadow axis) from Earth's center, in
   * Earth radii, for a geocentric Sun–Moon separation in degrees.
   */
  private static getGamma(
    separation: number,
    coordinates: EclipseCoordinates,
  ): number {
    const sun = coordinates.distanceSun * KILOMETERS_PER_ASTRONOMICAL_UNIT;
    const moon = coordinates.distanceMoon * KILOMETERS_PER_ASTRONOMICAL_UNIT;
    const angle = separation / DEGREES_PER_RADIAN;
    const sunToMoon = Math.sqrt(
      sun ** 2 + moon ** 2 - 2 * sun * moon * Math.cos(angle),
    );
    return (
      (sun * moon * Math.sin(angle)) /
      sunToMoon /
      EARTH_EQUATORIAL_RADIUS_KILOMETERS
    );
  }

  /**
   * Radius in kilometers of the Moon's umbra `behind` kilometers past the
   * Moon along the shadow axis. It shrinks to zero at the umbra's tip and
   * is negative beyond it, where the antumbra makes an eclipse annular.
   */
  private static getUmbralRadius(
    behind: number,
    coordinates: EclipseCoordinates,
  ): number {
    const sunToMoon =
      (coordinates.distanceSun - coordinates.distanceMoon) *
      KILOMETERS_PER_ASTRONOMICAL_UNIT;
    const moonRadius = radiusKilometersByHorizonBody.moon;
    return (
      moonRadius -
      (behind * (radiusKilometersByHorizonBody.sun - moonRadius)) / sunToMoon
    );
  }

  /**
   * Whether the eclipse is in progress at any minute of the window, which
   * also covers a contact stamped on the minute just outside it.
   */
  private static isInProgress(
    window: {
      current: EclipseCoordinates;
      next: EclipseCoordinates;
      previous: EclipseCoordinates;
    },
    getContactGeometry: (
      coordinates: EclipseCoordinates,
    ) => EclipseContactGeometry,
  ): boolean {
    return [window.previous, window.current, window.next].some(
      (coordinates) => {
        const { contactLimit, separation } = getContactGeometry(coordinates);
        return separation < contactLimit;
      },
    );
  }

  // 🌎 Public Methods

  /**
   * Classifies a lunar eclipse from any minute of it by the Moon's closest
   * approach to the shadow axis: total if the whole Moon enters the umbra
   * (radius 1.01·π☾ + π☉ − s☉), partial if part of it does, penumbral if it
   * only meets the penumbra. Null unless the eclipse is in progress in the
   * window.
   */
  getLunarEclipseType(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): LunarEclipseType | null {
    const window = { current, next, previous };
    if (
      !EclipseClassificationService.isInProgress(window, (coordinates) =>
        this.eclipseGeometryService.getLunarContactGeometry(coordinates),
      )
    ) {
      return null;
    }
    const closestApproach = EclipseClassificationService.getClosestApproach(
      window,
      (coordinates) =>
        this.eclipseGeometryService.getAntisolarPoint(coordinates),
    );
    const { moonParallax, moonSemidiameter, sunParallax, sunSemidiameter } =
      this.eclipseGeometryService.getDiscAngles(current);
    const shadowRadius = DANJON_SHADOW_ENLARGEMENT * moonParallax + sunParallax;
    const umbralRadius = shadowRadius - sunSemidiameter;

    if (closestApproach <= umbralRadius - moonSemidiameter) {
      return "total";
    }
    if (closestApproach <= umbralRadius + moonSemidiameter) {
      return "partial";
    }
    if (closestApproach <= shadowRadius + sunSemidiameter + moonSemidiameter) {
      return "penumbral";
    }
    return null;
  }

  /**
   * Classifies a solar eclipse from any minute of it by the shadow axis's
   * closest approach to Earth's center (gamma). Partial if the umbra and
   * antumbra miss Earth. Otherwise total or annular by whether the umbra
   * still reaches the observer under the axis at greatest eclipse, and
   * hybrid if it does there but not at the path's ends, where the observer
   * on Earth's limb is farther from the Moon. Null unless the eclipse is in
   * progress in the window.
   */
  getSolarEclipseType(
    current: EclipseCoordinates,
    previous: EclipseCoordinates,
    next: EclipseCoordinates,
  ): null | SolarEclipseType {
    const window = { current, next, previous };
    if (
      !EclipseClassificationService.isInProgress(window, (coordinates) =>
        this.eclipseGeometryService.getSolarContactGeometry(coordinates),
      )
    ) {
      return null;
    }
    const closestApproach = EclipseClassificationService.getClosestApproach(
      window,
      (coordinates) => this.eclipseGeometryService.getSunPosition(coordinates),
    );
    const gamma = EclipseClassificationService.getGamma(
      closestApproach,
      current,
    );
    const moonDistance =
      current.distanceMoon * KILOMETERS_PER_ASTRONOMICAL_UNIT;
    const radiusAtEarth = EclipseClassificationService.getUmbralRadius(
      moonDistance,
      current,
    );
    if (
      gamma - Math.abs(radiusAtEarth) / EARTH_EQUATORIAL_RADIUS_KILOMETERS >=
      1
    ) {
      return "partial";
    }
    const underAxis =
      moonDistance -
      EARTH_EQUATORIAL_RADIUS_KILOMETERS *
        Math.sqrt(Math.max(0, 1 - gamma ** 2));
    const atGreatest =
      EclipseClassificationService.getUmbralRadius(underAxis, current) > 0
        ? "total"
        : "annular";
    const atEnds = radiusAtEarth > 0 ? "total" : "annular";
    return atGreatest === atEnds ? atGreatest : "hybrid";
  }

  /**
   * Distance of the shadow axis from Earth's center at this minute, in
   * Earth radii (unsigned gamma). Greatest eclipse is its minimum.
   */
  getSolarGamma(coordinates: EclipseCoordinates): number {
    return EclipseClassificationService.getGamma(
      this.eclipseGeometryService.getSolarContactGeometry(coordinates)
        .separation,
      coordinates,
    );
  }
}
