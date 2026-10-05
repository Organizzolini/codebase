import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment, { type Moment } from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { EphemerisService } from "../ephemeris/ephemeris.service";
import { MathService } from "../math/math.service";

import { EclipseCalculationService } from "./eclipse-calculation.service";
import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";

import type { EclipsePhase } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { NeighborValues } from "../math/math.types";
import type { EclipseCoordinates, EclipseFrame } from "./eclipses.types";

describe(EclipseCalculationService, () => {
  let service: EclipseCalculationService;
  let ephemerisService: ReturnType<typeof createMock<EphemerisService>>;
  let eclipseEventService: ReturnType<typeof createMock<EclipseEventService>>;
  let geometryService: ReturnType<typeof createMock<EclipseGeometryService>>;
  let topocentricService: ReturnType<
    typeof createMock<EclipseTopocentricService>
  >;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseCalculationService,
        EclipseGeometryService,
        EclipseTopocentricService,
        MathService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
        {
          provide: EclipseEventService,
          useValue: createMock<EclipseEventService>(),
        },
      ],
    }).compile();

    service = await module.resolve(EclipseCalculationService);
    await module.resolve(LoggerService);
    geometryService = await module.resolve(EclipseGeometryService);
    ephemerisService = await module.resolve(EphemerisService);
    eclipseEventService = await module.resolve(EclipseEventService);
    topocentricService = await module.resolve(EclipseTopocentricService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("isSolarEclipse", () => {
    it("returns maximum at conjunction minimum", () => {
      const result = service.isSolarEclipse(
        {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 100,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 99,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 101,
          longitudeSun: 100,
        },
      );

      expect(result).toBe("maximum");
    });

    it("returns null when latitude exceeds eclipse diameter threshold", () => {
      const result = service.isSolarEclipse(
        {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 5,
          latitudeSun: 0,
          longitudeMoon: 100,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 99,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 101,
          longitudeSun: 100,
        },
      );

      expect(result).toBeNull();
    });
  });

  describe("isLunarEclipse", () => {
    it("returns maximum at opposition maximum", () => {
      const result = service.isLunarEclipse(
        {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 280,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 279,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 281,
          longitudeSun: 100,
        },
      );

      expect(result).toBe("maximum");
    });

    it("returns null when not in opposition threshold", () => {
      const result = service.isLunarEclipse(
        {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 150,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 149,
          longitudeSun: 100,
        },
        {
          diameterMoon: 0,
          diameterSun: 0,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 151,
          longitudeSun: 100,
        },
      );

      expect(result).toBeNull();
    });
  });

  describe("active-state helpers", () => {
    it("reports active solar eclipse overlap", () => {
      const active = service.isSolarEclipseActive({
        diameterMoon: 0.5,
        diameterSun: 0.5,
        latitudeMoon: 0,
        latitudeSun: 0,
        longitudeMoon: 100.4,
        longitudeSun: 100,
      });

      expect(active).toBe(true);
    });

    it("reports inactive solar eclipse overlap", () => {
      const active = service.isSolarEclipseActive({
        diameterMoon: 0.5,
        diameterSun: 0.5,
        latitudeMoon: 5,
        latitudeSun: 0,
        longitudeMoon: 100,
        longitudeSun: 100,
      });

      expect(active).toBe(false);
    });

    it("reports active lunar eclipse overlap", () => {
      const active = service.isLunarEclipseActive({
        diameterMoon: 0.5,
        diameterSun: 0.5,
        latitudeMoon: 0,
        latitudeSun: 0,
        longitudeMoon: 279.5,
        longitudeSun: 100,
      });

      expect(active).toBe(true);
    });

    it("reports inactive lunar eclipse overlap", () => {
      const active = service.isLunarEclipseActive({
        diameterMoon: 0.5,
        diameterSun: 0.5,
        latitudeMoon: 0,
        latitudeSun: 0,
        longitudeMoon: 250,
        longitudeSun: 100,
      });

      expect(active).toBe(false);
    });
  });

  describe("getTopocentricEventsForDetect", () => {
    it("returns topocentric events when visibility and geometry align", () => {
      const moonEvent = {
        categories: ["Eclipse", "Lunar", "Topocentric Visibility"],
        description: "Lunar Eclipse begins (Topocentric Visibility)",
        end: moment.utc("2024-09-18T02:00:00.000Z"),
        start: moment.utc("2024-09-18T02:00:00.000Z"),
        summary: "📍 🌙🐉▶️ Lunar Eclipse begins",
      };
      const solarEvent = {
        categories: ["Eclipse", "Solar", "Topocentric Visibility"],
        description: "Solar Eclipse begins (Topocentric Visibility)",
        end: moment.utc("2024-04-08T18:00:00.000Z"),
        start: moment.utc("2024-04-08T18:00:00.000Z"),
        summary: "📍 ☀️🐉▶️ Solar Eclipse begins",
      };

      eclipseEventService.buildLunarEclipseEvent.mockReturnValue(moonEvent);
      eclipseEventService.buildSolarEclipseEvent.mockReturnValue(solarEvent);

      ephemerisService.getAzimuthElevationFromEphemeris.mockReturnValue(15);

      const coordinates: EclipseCoordinates = {
        diameterMoon: 0.5,
        diameterSun: 0.5,
        latitudeMoon: 0,
        latitudeSun: 0,
        longitudeMoon: 100,
        longitudeSun: 100,
      };

      const events = service.getTopocentricEventsForDetect({
        coordinates: {
          currentCoordinates: coordinates,
          nextCoordinates: { ...coordinates, longitudeMoon: 101 },
          previousCoordinates: { ...coordinates, longitudeMoon: 98 },
        },
        geocentricPhases: {
          lunarPhase: "beginning",
          solarPhase: "beginning",
        },
        minute: moment.utc("2024-04-08T18:00:00.000Z"),
        moonAzimuthElevationEphemeris: {},
        sunAzimuthElevationEphemeris: {},
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("delegation helpers", () => {
    it("delegates eclipse coordinate sampling and topocentric activity", () => {
      const coordinates = {
        currentCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 100,
          longitudeSun: 100,
        },
        nextCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 101,
          longitudeSun: 100,
        },
        previousCoordinates: {
          diameterMoon: 0.5,
          diameterSun: 0.5,
          latitudeMoon: 0,
          latitudeSun: 0,
          longitudeMoon: 99,
          longitudeSun: 100,
        },
      };
      vi.spyOn(geometryService, "getAllEclipseCoordinates").mockReturnValue(
        coordinates,
      );
      vi.spyOn(topocentricService, "isLunarTopocentricActive").mockReturnValue(
        true,
      );
      vi.spyOn(topocentricService, "isSolarTopocentricActive").mockReturnValue(
        false,
      );

      expect(
        service.getAllEclipseCoordinates({
          minute: moment.utc("2024-04-08T18:00:00.000Z"),
          moonCoordinateEphemeris: {},
          moonDiameterEphemeris: {},
          sunCoordinateEphemeris: {},
          sunDiameterEphemeris: {},
        }),
      ).toStrictEqual(coordinates);
      expect(geometryService.getAllEclipseCoordinates).toHaveBeenCalledWith(
        expect.objectContaining({
          minute: moment.utc("2024-04-08T18:00:00.000Z"),
          moonCoordinateEphemeris: {},
          moonDiameterEphemeris: {},
          sunCoordinateEphemeris: {},
          sunDiameterEphemeris: {},
        }),
      );

      expect(
        service.isLunarTopocentricActive(coordinates.currentCoordinates, true),
      ).toBe(true);
      expect(
        service.isSolarTopocentricActive(coordinates.currentCoordinates, true),
      ).toBe(false);
    });
  });

  describe("branch coverage", () => {
    const mockedGeometryService = {
      getAllEclipseCoordinates: vi.fn<
        (args: {
          minute: Moment;
          moonCoordinateEphemeris: Record<
            string,
            { latitude: number; longitude: number }
          >;
          moonDiameterEphemeris: Record<string, { diameter: number }>;
          sunCoordinateEphemeris: Record<
            string,
            { latitude: number; longitude: number }
          >;
          sunDiameterEphemeris: Record<string, { diameter: number }>;
        }) => {
          currentCoordinates: EclipseCoordinates;
          nextCoordinates: EclipseCoordinates;
          previousCoordinates: EclipseCoordinates;
        }
      >(),
      getEclipseAngles: vi.fn<
        (
          current: EclipseCoordinates,
          previous: EclipseCoordinates,
          next: EclipseCoordinates,
        ) => {
          currentDiameter: number;
          currentLatitudeAngle: number;
          currentLongitudeAngle: number;
          nextLongitudeAngle: number;
          previousLongitudeAngle: number;
        }
      >(),
    };
    const mockedTopocentricService = {
      getTopocentricEvents:
        vi.fn<
          (args: {
            currentCoordinates: EclipseCoordinates;
            lunarPhase: EclipsePhase | null;
            minute: Moment;
            moonAzimuthElevationEphemeris: Record<
              string,
              { azimuth: number; elevation: number }
            >;
            nextCoordinates: EclipseCoordinates;
            previousCoordinates: EclipseCoordinates;
            solarPhase: EclipsePhase | null;
            sunAzimuthElevationEphemeris: Record<
              string,
              { azimuth: number; elevation: number }
            >;
          }) => Event[]
        >(),
      isLunarEclipseActive: vi.fn<(current: EclipseCoordinates) => boolean>(),
      isLunarTopocentricActive:
        vi.fn<
          (coordinates: EclipseCoordinates, isVisible: boolean) => boolean
        >(),
      isSolarEclipseActive: vi.fn<(current: EclipseCoordinates) => boolean>(),
      isSolarTopocentricActive:
        vi.fn<
          (coordinates: EclipseCoordinates, isVisible: boolean) => boolean
        >(),
    };
    const mockedEventService = {
      buildLunarEclipseEvent:
        vi.fn<
          (args: {
            date: Moment;
            frame: EclipseFrame;
            phase: EclipsePhase;
          }) => Event
        >(),
      buildSolarEclipseEvent:
        vi.fn<
          (args: {
            date: Moment;
            frame: EclipseFrame;
            phase: EclipsePhase;
          }) => Event
        >(),
    };
    const mockedMathService = {
      isMaximum: vi.fn<(args: NeighborValues) => boolean>(),
      isMinimum: vi.fn<(args: NeighborValues) => boolean>(),
    };
    const branchService = new EclipseCalculationService(
      new LoggerService(),
      mockedMathService as never,
      mockedGeometryService as never,
      mockedTopocentricService as never,
      mockedEventService as never,
    );

    beforeEach(() => {
      vi.restoreAllMocks();
      vi.clearAllMocks();
    });

    it("builds geocentric events for both eclipse phases", () => {
      const minute = moment.utc("2024-04-08T18:00:00.000Z");
      const solarEvent = {
        categories: ["Eclipse", "Solar"],
        description: "Solar",
        end: minute,
        start: minute,
        summary: "Solar",
      } as Event;
      const lunarEvent = {
        categories: ["Eclipse", "Lunar"],
        description: "Lunar",
        end: minute,
        start: minute,
        summary: "Lunar",
      } as Event;

      mockedEventService.buildSolarEclipseEvent.mockReturnValue(solarEvent);
      mockedEventService.buildLunarEclipseEvent.mockReturnValue(lunarEvent);

      vi.spyOn(branchService, "isSolarEclipse").mockReturnValue("beginning");
      vi.spyOn(branchService, "isLunarEclipse").mockReturnValue("ending");

      expect(
        branchService.getGeocentricEvents({
          currentCoordinates: {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 100,
            longitudeSun: 100,
          },
          minute,
          nextCoordinates: {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 101,
            longitudeSun: 101,
          },
          previousCoordinates: {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 99,
            longitudeSun: 99,
          },
        }),
      ).toStrictEqual({
        events: [solarEvent, lunarEvent],
        lunarPhase: "ending",
        solarPhase: "beginning",
      });
      expect(mockedEventService.buildSolarEclipseEvent).toHaveBeenCalledWith({
        date: minute,
        frame: "geocentric",
        phase: "beginning",
      });
      expect(mockedEventService.buildLunarEclipseEvent).toHaveBeenCalledWith({
        date: minute,
        frame: "geocentric",
        phase: "ending",
      });
    });

    it("classifies solar eclipse beginning and ending", () => {
      mockedGeometryService.getEclipseAngles.mockReturnValue({
        currentDiameter: 10,
        currentLatitudeAngle: 1,
        currentLongitudeAngle: 9,
        nextLongitudeAngle: 8,
        previousLongitudeAngle: 12,
      });
      mockedMathService.isMinimum.mockReturnValue(false);

      expect(
        branchService.isSolarEclipse(
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 100,
            longitudeSun: 90,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 95,
            longitudeSun: 85,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 105,
            longitudeSun: 95,
          },
        ),
      ).toBe("beginning");

      mockedGeometryService.getEclipseAngles.mockReturnValue({
        currentDiameter: 10,
        currentLatitudeAngle: 1,
        currentLongitudeAngle: 9,
        nextLongitudeAngle: 12,
        previousLongitudeAngle: 8,
      });

      expect(
        branchService.isSolarEclipse(
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 100,
            longitudeSun: 90,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 95,
            longitudeSun: 85,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 105,
            longitudeSun: 95,
          },
        ),
      ).toBe("ending");

      mockedGeometryService.getEclipseAngles.mockReturnValue({
        currentDiameter: 10,
        currentLatitudeAngle: 20,
        currentLongitudeAngle: 9,
        nextLongitudeAngle: 12,
        previousLongitudeAngle: 8,
      });

      expect(
        branchService.isSolarEclipse(
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 100,
            longitudeSun: 90,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 95,
            longitudeSun: 85,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 105,
            longitudeSun: 95,
          },
        ),
      ).toBeNull();
    });

    it("classifies lunar eclipse beginning and ending", () => {
      mockedGeometryService.getEclipseAngles.mockReturnValue({
        currentDiameter: 10,
        currentLatitudeAngle: 1,
        currentLongitudeAngle: 171,
        nextLongitudeAngle: 172,
        previousLongitudeAngle: 169,
      });
      mockedMathService.isMaximum.mockReturnValue(false);

      expect(
        branchService.isLunarEclipse(
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 280,
            longitudeSun: 100,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 279,
            longitudeSun: 100,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 281,
            longitudeSun: 100,
          },
        ),
      ).toBe("beginning");

      mockedGeometryService.getEclipseAngles.mockReturnValue({
        currentDiameter: 10,
        currentLatitudeAngle: 1,
        currentLongitudeAngle: 171,
        nextLongitudeAngle: 169,
        previousLongitudeAngle: 172,
      });

      expect(
        branchService.isLunarEclipse(
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 280,
            longitudeSun: 100,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 279,
            longitudeSun: 100,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 281,
            longitudeSun: 100,
          },
        ),
      ).toBe("ending");
    });

    it("returns null when eclipse phase checks are active but no transition applies", () => {
      mockedMathService.isMinimum.mockReturnValue(false);
      mockedGeometryService.getEclipseAngles.mockReturnValue({
        currentDiameter: 10,
        currentLatitudeAngle: 1,
        currentLongitudeAngle: 10,
        nextLongitudeAngle: 9,
        previousLongitudeAngle: 8,
      });

      expect(
        branchService.isSolarEclipse(
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 100,
            longitudeSun: 90,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 99,
            longitudeSun: 90,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 101,
            longitudeSun: 90,
          },
        ),
      ).toBeNull();

      mockedMathService.isMaximum.mockReturnValue(false);
      mockedGeometryService.getEclipseAngles.mockReturnValue({
        currentDiameter: 10,
        currentLatitudeAngle: 12,
        currentLongitudeAngle: 175,
        nextLongitudeAngle: 176,
        previousLongitudeAngle: 174,
      });

      expect(
        branchService.isLunarEclipse(
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 280,
            longitudeSun: 100,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 279,
            longitudeSun: 100,
          },
          {
            diameterMoon: 0.5,
            diameterSun: 0.5,
            latitudeMoon: 0,
            latitudeSun: 0,
            longitudeMoon: 281,
            longitudeSun: 100,
          },
        ),
      ).toBeNull();
    });

    it("builds only the available geocentric phase events", () => {
      const buildGeocentricEclipseEvents = (
        branchService as unknown as {
          buildGeocentricEclipseEvents: (
            minute: Moment,
            solarPhase: "beginning" | "ending" | "maximum" | null,
            lunarPhase: "beginning" | "ending" | "maximum" | null,
          ) => Event[];
        }
      ).buildGeocentricEclipseEvents.bind(branchService);
      const minute = moment.utc("2024-04-08T18:00:00.000Z");
      const solarEvent = {
        categories: ["Eclipse", "Solar"],
        description: "solar",
        end: minute,
        start: minute,
        summary: "solar",
      } as Event;
      const lunarEvent = {
        categories: ["Eclipse", "Lunar"],
        description: "lunar",
        end: minute,
        start: minute,
        summary: "lunar",
      } as Event;
      mockedEventService.buildSolarEclipseEvent.mockReturnValue(solarEvent);
      mockedEventService.buildLunarEclipseEvent.mockReturnValue(lunarEvent);

      expect(
        buildGeocentricEclipseEvents(minute, "beginning", null),
      ).toStrictEqual([solarEvent]);
      expect(
        buildGeocentricEclipseEvents(minute, null, "ending"),
      ).toStrictEqual([lunarEvent]);
    });
  });
});
