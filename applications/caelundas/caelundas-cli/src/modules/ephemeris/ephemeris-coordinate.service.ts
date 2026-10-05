import { Injectable } from "@nestjs/common";
import { calc, constants, nod_aps_ut } from "sweph";

import { MathService } from "../math/math.service";

import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import {
  OSCULATING_ORBITAL_ELEMENTS_FLAG,
  SWISS_EPHEMERIS_FLAGS,
  swissEphemerisConstantByNode,
} from "./ephemeris.constants";

import type { Body, Node } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris, DistanceEphemeris } from "./ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Body and node coordinate computation for equatorial and ecliptic coordinates.
 */
@Injectable()
export class EphemerisCoordinateService {
  // 🏗 Dependency Injection

  constructor(
    private readonly ephemerisConstantsService: EphemerisConstantsService,
    private readonly time: EphemerisTimeService,
    private readonly mathService: MathService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Computes body ecliptic coordinates (longitude, latitude, distance).
   */
  private computeBodyCoordinates(
    body: Exclude<Body, Node>,
    julianDayEphemerisTime: number,
  ): { distance: number; latitude: number; longitude: number } {
    const swissEphemerisConstant =
      this.ephemerisConstantsService.getSwissEphemerisConstantForBody(body);
    const result = calc(
      julianDayEphemerisTime,
      swissEphemerisConstant,
      SWISS_EPHEMERIS_FLAGS,
    );
    if (result.flag < 0) {
      throw new Error(`calc failed for ${body}: ${result.error}`);
    }
    return {
      distance: result.data[2],
      latitude: result.data[1],
      longitude: result.data[0],
    };
  }

  /**
   * Computes lunar perigee (apogee in modern terms) ecliptic coordinates.
   */
  private computeLunarPerigeeCoordinate(julianDayUniversalTime: number): {
    latitude: number;
    longitude: number;
  } {
    const result = nod_aps_ut(
      julianDayUniversalTime,
      constants.SE_MOON,
      SWISS_EPHEMERIS_FLAGS,
      OSCULATING_ORBITAL_ELEMENTS_FLAG,
    );
    if (result.flag < 0) {
      throw new Error(`nod_aps_ut failed for lunar perigee: ${result.error}`);
    }
    return {
      latitude: 0,
      longitude: this.mathService.normalizeDegrees(result.data.perihelion[0]),
    };
  }

  /**
   * Computes node coordinate (lunar node or perigee).
   * Dispatches to the appropriate computation based on node type.
   */
  private computeNodeCoordinate(
    node: Node,
    julianDayEphemerisTime: number,
    julianDayUniversalTime: number,
  ): { latitude: number; longitude: number } {
    if (node === "lunar perigee") {
      return this.computeLunarPerigeeCoordinate(julianDayUniversalTime);
    }
    return this.computeRegularNodeCoordinate(node, julianDayEphemerisTime);
  }

  /**
   * Computes regular lunar/solar node ecliptic coordinates.
   * Adjusts south lunar node longitude by 180°.
   */
  private computeRegularNodeCoordinate(
    node: Node,
    julianDayEphemerisTime: number,
  ): { latitude: number; longitude: number } {
    const swissEphemerisConstant = swissEphemerisConstantByNode[node];
    if (swissEphemerisConstant === null) {
      throw new Error(
        `No Swiss Ephemeris constant configured for node: ${node}`,
      );
    }
    const result = calc(
      julianDayEphemerisTime,
      swissEphemerisConstant,
      SWISS_EPHEMERIS_FLAGS,
    );
    if (result.flag < 0) {
      throw new Error(`calc failed for ${node}: ${result.error}`);
    }
    const longitude =
      node === "south lunar node"
        ? this.mathService.normalizeDegrees(result.data[0] + 180)
        : this.mathService.normalizeDegrees(result.data[0]);
    return { latitude: 0, longitude };
  }

  // 🌎 Public Methods

  /**
   * Computes single body coordinate at a specific Julian Day ephemeris time.
   * Returns latitude and longitude in ecliptic coordinates.
   */
  public computeBodyCoordinate(
    body: Exclude<Body, Node>,
    julianDayEphemerisTime: number,
  ): { latitude: number; longitude: number } {
    const coords = this.getBodyCoordinatesWithDistance(
      body,
      julianDayEphemerisTime,
    );
    return { latitude: coords.latitude, longitude: coords.longitude };
  }

  /**   * Computes minute-by-minute geocentric distance for a single body.
   * Distance is stored in astronomical units (AU) as extracted from calc() data[2].
   *
   * @throws When calc fails for the body.
   */
  public computeDistanceForBody(args: {
    body: Exclude<Body, Node>;
    end: Moment;
    start: Moment;
  }): DistanceEphemeris {
    const { body, end, start } = args;
    const ephemeris: DistanceEphemeris = {};

    for (const date of this.time.generateMinutes(start, end)) {
      const { julianDayEphemerisTime } = this.time.dateToJulianDays(date);
      const timestamp = date.toISOString();
      const { distance } = this.computeBodyCoordinates(
        body,
        julianDayEphemerisTime,
      );
      ephemeris[timestamp] = { distance };
    }
    return ephemeris;
  }

  /**
   * Computes minute-by-minute coordinates for a node (lunar/solar nodes and lunar perigee).
   * Returns latitude (always 0 for nodes) and longitude in ecliptic coordinates.
   */
  public computeNodeBodyMinutes(args: {
    body: Node;
    end: Moment;
    start: Moment;
  }): CoordinateEphemeris {
    const { body, end, start } = args;
    const coordinateEphemeris: CoordinateEphemeris = {};
    for (const date of this.time.generateMinutes(start, end)) {
      const { julianDayEphemerisTime, julianDayUniversalTime } =
        this.time.dateToJulianDays(date);
      const coord = this.computeNodeCoordinate(
        body,
        julianDayEphemerisTime,
        julianDayUniversalTime,
      );
      coordinateEphemeris[date.toISOString()] = coord;
    }
    return coordinateEphemeris;
  }

  /**
   * Computes body ecliptic coordinates (longitude, latitude, distance).
   * Used internally by horizon and aggregation services.
   */
  public getBodyCoordinatesWithDistance(
    body: Exclude<Body, Node>,
    julianDayEphemerisTime: number,
  ): { distance: number; latitude: number; longitude: number } {
    return this.computeBodyCoordinates(body, julianDayEphemerisTime);
  }
}
