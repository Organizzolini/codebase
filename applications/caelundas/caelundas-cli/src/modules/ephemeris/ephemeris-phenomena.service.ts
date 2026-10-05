import { Injectable } from "@nestjs/common";
import { pheno_ut } from "sweph";

import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisTimeService } from "./ephemeris-time.service";
import { SWISS_EPHEMERIS_FLAGS } from "./ephemeris.constants";

import type { Body, Node } from "../caelundas/caelundas.types";
import type {
  DiameterEphemeris,
  IlluminationEphemeris,
} from "./ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Pheno-based illumination fraction and apparent diameter calculations.
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

  /**
   * Computes pheno for the Sun at a specific moment.
   * Sun illumination is always 100%; diameter is computed via pheno_ut if requested.
   *
   * @throws When pheno_ut fails.
   */
  private computePhenoForSunMinute(args: {
    body: Exclude<Body, Node>;
    diameterEphemeris: DiameterEphemeris;
    illuminationEphemeris: IlluminationEphemeris;
    julianDayUniversalTime: number;
    needsDiameter: boolean;
    needsIllumination: boolean;
    swissEphemerisConstant: number;
    timestamp: string;
  }): void {
    const {
      body,
      diameterEphemeris,
      illuminationEphemeris,
      julianDayUniversalTime,
      needsDiameter,
      needsIllumination,
      swissEphemerisConstant,
      timestamp,
    } = args;
    if (needsIllumination)
      illuminationEphemeris[timestamp] = { illumination: 100 };
    if (needsDiameter) {
      const result = pheno_ut(
        julianDayUniversalTime,
        swissEphemerisConstant,
        SWISS_EPHEMERIS_FLAGS,
      );
      if (result.flag < 0)
        throw new Error(`pheno_ut failed for ${body}: ${result.error}`);
      diameterEphemeris[timestamp] = { diameter: result.data[3] };
    }
  }

  // 🌎 Public Methods

  /**
   * Computes minute-by-minute apparent angular diameter for a single body.
   * Diameter is stored in degrees as returned by pheno_ut() data[3].
   *
   * @throws When pheno_ut fails for a non-Sun body.
   */
  public computeDiameterForBody(args: {
    body: Exclude<Body, Node>;
    end: Moment;
    start: Moment;
  }): DiameterEphemeris {
    const { body, end, start } = args;
    const ephemeris: DiameterEphemeris = {};
    const swissEphemerisConstant =
      this.constants.getSwissEphemerisConstantForBody(body);

    for (const date of this.time.generateMinutes(start, end)) {
      const { julianDayUniversalTime } = this.time.dateToJulianDays(date);
      const timestamp = date.toISOString();
      const result = pheno_ut(
        julianDayUniversalTime,
        swissEphemerisConstant,
        SWISS_EPHEMERIS_FLAGS,
      );
      if (result.flag < 0) {
        throw new Error(`pheno_ut failed for ${body}: ${result.error}`);
      }
      // data[3] = apparent diameter of disc in degrees
      ephemeris[timestamp] = { diameter: result.data[3] };
    }
    return ephemeris;
  }

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
   * Computes pheno (illumination + diameter) for a non-Sun body at a specific moment.
   * Stores results into the provided ephemeris maps if requested.
   *
   * @throws When pheno_ut fails.
   */
  public computePhenoForBodyMinute(args: {
    body: Exclude<Body, Node>;
    diameterEphemeris: DiameterEphemeris;
    illuminationEphemeris: IlluminationEphemeris;
    julianDayUniversalTime: number;
    needsDiameter: boolean;
    needsIllumination: boolean;
    swissEphemerisConstant: number;
    timestamp: string;
  }): void {
    const {
      body,
      diameterEphemeris,
      illuminationEphemeris,
      julianDayUniversalTime,
      needsDiameter,
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
    if (needsDiameter)
      diameterEphemeris[timestamp] = { diameter: result.data[3] };
  }

  /**
   * Computes pheno for any body (Sun or non-Sun).
   * Dispatches to the appropriate handler based on body identity.
   */
  public computePhenoForMinute(args: {
    body: Exclude<Body, Node>;
    diameterEphemeris: DiameterEphemeris;
    illuminationEphemeris: IlluminationEphemeris;
    julianDayUniversalTime: number;
    needsDiameter: boolean;
    needsIllumination: boolean;
    swissEphemerisConstant: number;
    timestamp: string;
  }): void {
    if (args.body === "sun") {
      this.computePhenoForSunMinute(args);
    } else {
      this.computePhenoForBodyMinute(args);
    }
  }
}
