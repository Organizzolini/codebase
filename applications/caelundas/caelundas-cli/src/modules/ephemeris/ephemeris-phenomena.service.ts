import { Injectable } from "@nestjs/common";
import { pheno_ut } from "sweph";

import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import { SWISS_EPHEMERIS_FLAGS } from "./ephemeris.constants";

import type { Body, Node } from "../caelundas/caelundas.types";
import type { IlluminationEphemeris } from "./ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Pheno-based illumination fraction calculations.
 */
@Injectable()
export class EphemerisPhenomenaService {
  // 🏗 Dependency Injection

  constructor(
    private readonly constants: EphemerisConstantsService,
    private readonly time: EphemerisTimeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Computes minute-by-minute illumination fraction for requested bodies.
   * Illumination is stored as a percentage (0-100). The Sun is always 100%.
   * Uses pheno_ut() which returns a fraction (0-1); multiplied by 100 for storage.
   *
   * @throws When pheno_ut fails for a non-Sun body.
   */
  public computeIlluminationForBody(args: {
    body: Exclude<Body, Node>;
    end: Moment;
    start: Moment;
  }): IlluminationEphemeris {
    const { body, end, start } = args;
    const ephemeris: IlluminationEphemeris = {};
    const swissEphemerisConstant =
      this.constants.getSwissEphemerisConstantForBody(body);
    for (const date of this.time.generateMinutes(start, end)) {
      const { julianDayUniversalTime } = this.time.dateToJulianDays(date);
      const timestamp = date.toISOString();
      if (body === "sun") {
        ephemeris[timestamp] = { illumination: 100 };
        continue;
      }
      const result = pheno_ut(
        julianDayUniversalTime,
        swissEphemerisConstant,
        SWISS_EPHEMERIS_FLAGS,
      );
      if (result.flag < 0) {
        throw new Error(`pheno_ut failed for ${body}: ${result.error}`);
      }
      ephemeris[timestamp] = { illumination: result.data[1] * 100 };
    }
    return ephemeris;
  }

  /**
   * Computes pheno illumination for a non-Sun body at a specific moment.
   * Stores results into the provided ephemeris maps if requested.
   *
   * @throws When pheno_ut fails.
   */
  public computePhenoForBodyMinute(args: {
    body: Exclude<Body, Node>;
    illuminationEphemeris: IlluminationEphemeris;
    julianDayUniversalTime: number;
    needsIllumination: boolean;
    swissEphemerisConstant: number;
    timestamp: string;
  }): void {
    const {
      body,
      illuminationEphemeris,
      julianDayUniversalTime,
      needsIllumination,
      swissEphemerisConstant,
      timestamp,
    } = args;
    const result = pheno_ut(
      julianDayUniversalTime,
      swissEphemerisConstant,
      SWISS_EPHEMERIS_FLAGS,
    );
    if (result.flag < 0) {
      throw new Error(`pheno_ut failed for ${body}: ${result.error}`);
    }
    if (needsIllumination)
      illuminationEphemeris[timestamp] = { illumination: result.data[1] * 100 };
  }

  /**
   * Computes illumination for any body (Sun or non-Sun).
   * The Sun is fixed at 100% and never calls pheno_ut.
   */
  public computePhenoForMinute(args: {
    body: Exclude<Body, Node>;
    illuminationEphemeris: IlluminationEphemeris;
    julianDayUniversalTime: number;
    needsIllumination: boolean;
    swissEphemerisConstant: number;
    timestamp: string;
  }): void {
    if (args.body === "sun") {
      // The Sun is always fully illuminated, so there is nothing to ask pheno_ut.
      if (args.needsIllumination)
        args.illuminationEphemeris[args.timestamp] = { illumination: 100 };
    } else {
      this.computePhenoForBodyMinute(args);
    }
  }
}
