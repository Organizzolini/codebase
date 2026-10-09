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
 * https://ssd.jpl.nasa.gov/api/horizons.api with QUANTITIES='4,13', once
 * with APPARENT='REFRACTED' and once with APPARENT='AIRLESS'.
 *
 * A geocentric Moon sits about 0.47° higher at culmination and about 1°
 * higher on the horizon: the parallax a horizon event must not ignore.
 */
const philadelphia = { latitude: 39.949_309, longitude: -75.171_69 };
const moonCulmination = "2026-03-20T18:26:00.000Z";
const moonrise = "2026-03-20T11:38:00.000Z";
/** Horizons, refracted elevation at the Moon's upper transit. */
const horizonsRefractedCulminationElevation = 61.795_438;
/** Horizons, airless (true) elevation at USNO's moonrise minute. */
const horizonsAirlessMoonriseElevation = -0.771_692;
/** Horizons, angular diameter 1941.923″ at USNO's moonrise minute, halved. */
const horizonsMoonriseSemidiameter = 1941.923 / 2 / 3600;
/** USNO's standard refraction at the horizon, 34′, in degrees. */
const horizonRefraction = 34 / 60;

describe("ephemerisHorizonService against JPL Horizons", () => {
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

  it("gives the Moon's true elevation at moonrise, without refraction", () => {
    expect(moonEphemeris[moonrise]?.trueElevation).toBeCloseTo(
      horizonsAirlessMoonriseElevation,
      2,
    );
  });

  it("gives the Moon's topocentric semidiameter", () => {
    expect(moonEphemeris[moonrise]?.semidiameter).toBeCloseTo(
      horizonsMoonriseSemidiameter,
      3,
    );
  });

  it("puts the Moon's upper limb on the horizon at USNO's moonrise minute", () => {
    const sample = moonEphemeris[moonrise];
    const upperLimbAltitude =
      (sample?.trueElevation ?? Number.NaN) +
      (sample?.semidiameter ?? Number.NaN) +
      horizonRefraction;

    // The Moon climbs about 0.2° a minute here, so ±30 s is ±0.1°.
    expect(Math.abs(upperLimbAltitude)).toBeLessThan(0.1);
  });
});
