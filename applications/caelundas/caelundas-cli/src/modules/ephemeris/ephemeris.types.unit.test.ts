import { describe, expect, it } from "vitest";

import type {
  AzimuthElevationEphemeris,
  AzimuthElevationEphemerisBody,
  CoordinateEphemeris,
  CoordinateEphemerisBody,
  Coordinates,
  DiameterEphemeris,
  DiameterEphemerisBody,
  DistanceEphemeris,
  DistanceEphemerisBody,
  IlluminationEphemeris,
  IlluminationEphemerisBody,
  Latitude,
  Longitude,
} from "./ephemeris.types";

describe("ephemeris.types", () => {
  describe("coordinates type", () => {
    it("accepts valid longitude and latitude tuple", () => {
      const coords: Coordinates = [-74.006, 40.7128]; // New York

      expect(coords[0]).toBe(-74.006);
      expect(coords[1]).toBe(40.7128);
    });

    it("has exactly 2 elements", () => {
      const coords: Coordinates = [-118.2437, 34.0522]; // Los Angeles

      expect(coords).toHaveLength(2);
    });
  });

  describe("latitude and Longitude types", () => {
    it("accepts numeric values for latitude", () => {
      const lat: Latitude = 40.7128;

      expect(typeof lat).toBe("number");
      expect(lat).toBe(40.7128);
    });

    it("accepts numeric values for longitude", () => {
      const lon: Longitude = -74.006;

      expect(typeof lon).toBe("number");
      expect(lon).toBe(-74.006);
    });

    it("accepts negative values", () => {
      const southLat: Latitude = -33.8688; // Sydney
      const westLon: Longitude = -118.2437; // Los Angeles

      expect(southLat).toBeLessThan(0);
      expect(westLon).toBeLessThan(0);
    });
  });

  describe("coordinateEphemeris type", () => {
    it("accepts valid coordinate ephemeris structure", () => {
      const ephemeris: CoordinateEphemeris = {
        "2024-03-21T00:00:00.000Z": { latitude: 0, longitude: 0 },
        "2024-03-21T00:01:00.000Z": { latitude: 0.05, longitude: 0.1 },
      };

      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.longitude).toBe(0);
      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.latitude).toBe(0);
    });

    it("uses ISO string timestamps as keys", () => {
      const timestamp = "2024-03-21T00:00:00.000Z";
      const ephemeris: CoordinateEphemeris = {
        [timestamp]: { latitude: -5.2, longitude: 120.5 },
      };

      expect(ephemeris[timestamp]).toBeDefined();
      expect(ephemeris[timestamp]?.longitude).toBe(120.5);
    });
  });

  describe("azimuthElevationEphemeris type", () => {
    it("accepts valid azimuth and elevation values", () => {
      const ephemeris: AzimuthElevationEphemeris = {
        "2024-03-21T00:00:00.000Z": { azimuth: 90.5, elevation: 45.2 },
        "2024-03-21T00:01:00.000Z": { azimuth: 91, elevation: 46 },
      };

      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.azimuth).toBe(90.5);
      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.elevation).toBe(45.2);
    });

    it("accepts negative elevation values (below horizon)", () => {
      const ephemeris: AzimuthElevationEphemeris = {
        "2024-03-21T00:00:00.000Z": { azimuth: 180, elevation: -15.5 },
      };

      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.elevation).toBeLessThan(0);
    });
  });

  describe("illuminationEphemeris type", () => {
    it("accepts valid illumination fraction values", () => {
      const ephemeris: IlluminationEphemeris = {
        "2024-03-21T00:00:00.000Z": { illumination: 0.567 },
        "2024-03-21T00:01:00.000Z": { illumination: 0.568 },
      };

      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.illumination).toBe(0.567);
    });

    it("accepts values between 0 and 1", () => {
      const darkMoon: IlluminationEphemeris = {
        "2024-03-21T00:00:00.000Z": { illumination: 0.001 },
      };
      const fullMoon: IlluminationEphemeris = {
        "2024-03-21T00:00:00.000Z": { illumination: 0.999 },
      };

      expect(darkMoon["2024-03-21T00:00:00.000Z"]?.illumination).toBeLessThan(
        0.1,
      );
      expect(
        fullMoon["2024-03-21T00:00:00.000Z"]?.illumination,
      ).toBeGreaterThan(0.9);
    });
  });

  describe("distanceEphemeris type", () => {
    it("accepts valid distance values", () => {
      const ephemeris: DistanceEphemeris = {
        "2024-03-21T00:00:00.000Z": { distance: 1.0001 },
        "2024-03-21T00:01:00.000Z": { distance: 1.0002 },
      };

      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.distance).toBe(1.0001);
    });

    it("accepts distance in astronomical units", () => {
      const sunDistance: DistanceEphemeris = {
        "2024-03-21T00:00:00.000Z": { distance: 1 }, // ~1 AU
      };
      const marsDistance: DistanceEphemeris = {
        "2024-03-21T00:00:00.000Z": { distance: 1.5 }, // ~1.5 AU
      };

      expect(sunDistance["2024-03-21T00:00:00.000Z"]?.distance).toBeCloseTo(
        1,
        1,
      );
      expect(marsDistance["2024-03-21T00:00:00.000Z"]?.distance).toBeCloseTo(
        1.5,
        1,
      );
    });
  });

  describe("diameterEphemeris type", () => {
    it("accepts valid angular diameter values", () => {
      const ephemeris: DiameterEphemeris = {
        "2024-03-21T00:00:00.000Z": { diameter: 0.5334 },
        "2024-03-21T00:01:00.000Z": { diameter: 0.5181 },
      };

      expect(ephemeris["2024-03-21T00:00:00.000Z"]?.diameter).toBe(0.5334);
    });

    it("accepts diameter values in degrees", () => {
      const sunDiameter: DiameterEphemeris = {
        "2024-03-21T00:00:00.000Z": { diameter: 0.5334 }, // ~0.53 degrees
      };
      const moonDiameter: DiameterEphemeris = {
        "2024-03-21T00:00:00.000Z": { diameter: 0.5181 }, // ~0.52 degrees
      };

      expect(sunDiameter["2024-03-21T00:00:00.000Z"]?.diameter).toBeGreaterThan(
        0.5,
      );
      expect(
        moonDiameter["2024-03-21T00:00:00.000Z"]?.diameter,
      ).toBeGreaterThan(0.5);
    });
  });

  describe("body type constraints", () => {
    it("accepts sun and moon for AzimuthElevationEphemerisBody", () => {
      const sun: AzimuthElevationEphemerisBody = "sun";
      const moon: AzimuthElevationEphemerisBody = "moon";

      expect(sun).toBe("sun");
      expect(moon).toBe("moon");
    });

    it("accepts sun, moon, venus, mercury, mars for IlluminationEphemerisBody", () => {
      const bodies: IlluminationEphemerisBody[] = [
        "sun",
        "moon",
        "venus",
        "mercury",
        "mars",
      ];

      expect(bodies).toHaveLength(5);
      expect(bodies).toContain("sun");
      expect(bodies).toContain("moon");
      expect(bodies).toContain("venus");
    });

    it("accepts sun and moon for DiameterEphemerisBody", () => {
      const bodies: DiameterEphemerisBody[] = ["sun", "moon"];

      expect(bodies).toHaveLength(2);
      expect(bodies).toContain("sun");
      expect(bodies).toContain("moon");
    });

    it("accepts sun, venus, mercury, mars for DistanceEphemerisBody", () => {
      const bodies: DistanceEphemerisBody[] = [
        "sun",
        "venus",
        "mercury",
        "mars",
      ];

      expect(bodies).toHaveLength(4);
      expect(bodies).toContain("sun");
      expect(bodies).not.toContain("moon");
    });

    it("accepts all bodies for CoordinateEphemerisBody", () => {
      expect.hasAssertions(); // CoordinateEphemerisBody is just Body, so any celestial body should work

      const bodies: CoordinateEphemerisBody[] = [
        "sun",
        "mercury",
        "venus",
        "moon",
        "mars",
        "jupiter",
        "saturn",
        "uranus",
        "neptune",
        "pluto",
      ];

      expect(bodies.length).toBeGreaterThanOrEqual(10);
    });
  });
});
