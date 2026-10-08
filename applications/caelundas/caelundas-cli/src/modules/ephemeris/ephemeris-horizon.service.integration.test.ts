import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { initializeSwissEphemeris } from "./ephemeris.constants";
import { EphemerisModule } from "./ephemeris.module";
import { EphemerisService } from "./ephemeris.service";

import type { AzimuthElevationEphemeris } from "./ephemeris.types";

/**
 * The Moon seen from Philadelphia on 20 March 2026, checked against JPL
 * Horizons for a topocentric observer (site `coord@399`, geodetic
 * -75.17169, 39.949309, 0 km), retrieved 2026-10-07 from
 * https://ssd.jpl.nasa.gov/api/horizons.api with QUANTITIES='4'.
 *
 * A geocentric Moon sits about 0.47° higher at culmination and about 1°
 * higher on the horizon: the parallax a horizon event must not ignore.
 */
const philadelphia = { latitude: 39.949_309, longitude: -75.171_69 };
const moonCulmination = "2026-03-20T18:26:00.000Z";
const moonrise = "2026-03-20T11:38:00.000Z";
/** Horizons, refracted elevation at the Moon's upper transit. */
const horizonsRefractedCulminationElevation = 61.795_438;

describe("EphemerisHorizonService against JPL Horizons", () => {
  let moonEphemeris: AzimuthElevationEphemeris;

  beforeAll(async () => {
    initializeSwissEphemeris();
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
    }).compile();
    moonEphemeris = module
      .get(EphemerisService)
      .getAzimuthElevationEphemerisByBody({
        bodies: ["moon"],
        coordinates: [philadelphia.longitude, philadelphia.latitude],
        end: moment.utc(moonCulmination),
        start: moment.utc(moonrise),
        timezone: "America/New_York",
      }).moon;
  });

  it("places the culminating Moon where a Philadelphia observer sees it", () => {
    expect(moonEphemeris[moonCulmination]?.elevation).toBeCloseTo(
      horizonsRefractedCulminationElevation,
      2,
    );
  });
});
