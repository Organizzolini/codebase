import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MathService } from "../math/math.service";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";

import type { Event } from "../calendar/calendar.types";
import type { EclipseCoordinates } from "./eclipses.types";

describe(EclipseTopocentricService, () => {
  let service: EclipseTopocentricService;
  let eclipseGeometryService: DeepMocked<EclipseGeometryService>;
  let eclipseEventService: DeepMocked<EclipseEventService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseTopocentricService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: MathService,
          useValue: createMock<MathService>({
            getAngle: vi.fn<MathService["getAngle"]>(
              (value1: number, value2: number) => Math.abs(value1 - value2),
            ),
          }),
        },
        {
          provide: EclipseGeometryService,
          useValue: createMock<EclipseGeometryService>({
            getAllTopocentricVisibilities:
              vi.fn<EclipseGeometryService["getAllTopocentricVisibilities"]>(),
          }),
        },
        {
          provide: EclipseEventService,
          useValue: createMock<EclipseEventService>({
            buildLunarEclipseEvent:
              vi.fn<EclipseEventService["buildLunarEclipseEvent"]>(),
            buildSolarEclipseEvent:
              vi.fn<EclipseEventService["buildSolarEclipseEvent"]>(),
          }),
        },
      ],
    }).compile();

    service = await module.resolve(EclipseTopocentricService);
    eclipseGeometryService = module.get(EclipseGeometryService);
    eclipseEventService = module.get(EclipseEventService);
  });

  const solarActiveCoordinates: EclipseCoordinates = {
    diameterMoon: 0.6,
    diameterSun: 0.5,
    latitudeMoon: 1,
    latitudeSun: 1.2,
    longitudeMoon: 10,
    longitudeSun: 10.5,
  };

  const lunarActiveCoordinates: EclipseCoordinates = {
    diameterMoon: 0.6,
    diameterSun: 0.5,
    latitudeMoon: 1,
    latitudeSun: 1.2,
    longitudeMoon: 179.8,
    longitudeSun: 0.1,
  };

  const inactiveCoordinates: EclipseCoordinates = {
    diameterMoon: 0.6,
    diameterSun: 0.5,
    latitudeMoon: 10,
    latitudeSun: 0,
    longitudeMoon: 100,
    longitudeSun: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("detects solar and lunar topocentric activity predicates", () => {
    expect(service.isSolarEclipseActive(solarActiveCoordinates)).toBe(true);
    expect(service.isSolarEclipseActive(inactiveCoordinates)).toBe(false);
    expect(service.isSolarTopocentricActive(solarActiveCoordinates, true)).toBe(
      true,
    );
    expect(
      service.isSolarTopocentricActive(solarActiveCoordinates, false),
    ).toBe(false);

    expect(service.isLunarEclipseActive(lunarActiveCoordinates)).toBe(true);
    expect(service.isLunarEclipseActive(inactiveCoordinates)).toBe(false);
    expect(service.isLunarTopocentricActive(lunarActiveCoordinates, true)).toBe(
      true,
    );
    expect(
      service.isLunarTopocentricActive(lunarActiveCoordinates, false),
    ).toBe(false);
  });

  it("builds a beginning topocentric solar eclipse event", () => {
    eclipseGeometryService.getAllTopocentricVisibilities.mockReturnValueOnce({
      currentVisibility: { isLunarVisible: false, isSolarVisible: true },
      nextVisibility: { isLunarVisible: false, isSolarVisible: true },
      previousVisibility: { isLunarVisible: false, isSolarVisible: false },
    });

    eclipseEventService.buildSolarEclipseEvent.mockReturnValueOnce({
      categories: ["Eclipse", "Solar"],
      description: "Solar Eclipse begins",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "Solar",
    } satisfies Event);
    const events = service.getTopocentricEvents({
      currentCoordinates: solarActiveCoordinates,
      lunarPhase: "beginning",
      minute: moment.utc("2024-03-21T12:00:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: solarActiveCoordinates,
      previousCoordinates: inactiveCoordinates,
      solarPhase: "beginning",
      sunAzimuthElevationEphemeris: {},
    });

    const firstSolarEventCall =
      eclipseEventService.buildSolarEclipseEvent.mock.calls[0]?.[0];

    expect(firstSolarEventCall).toMatchObject({
      frame: "topocentric",
      phase: "beginning",
    });
    expect(firstSolarEventCall?.date).toBeDefined();
    expect(eclipseEventService.buildLunarEclipseEvent).toHaveBeenCalledTimes(0);
    expect(events).toHaveLength(1);
  });

  it("builds ending and maximum lunar events when phase and visibility conditions match", () => {
    eclipseGeometryService.getAllTopocentricVisibilities.mockReturnValueOnce({
      currentVisibility: { isLunarVisible: true, isSolarVisible: false },
      nextVisibility: { isLunarVisible: false, isSolarVisible: false },
      previousVisibility: { isLunarVisible: true, isSolarVisible: false },
    });

    eclipseEventService.buildLunarEclipseEvent.mockReturnValueOnce({
      categories: ["Eclipse", "Lunar"],
      description: "Lunar Eclipse ends",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "Lunar ends",
    } satisfies Event);

    const endingEvents = service.getTopocentricEvents({
      currentCoordinates: lunarActiveCoordinates,
      lunarPhase: "maximum",
      minute: moment.utc("2024-03-21T12:01:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: inactiveCoordinates,
      previousCoordinates: lunarActiveCoordinates,
      solarPhase: "maximum",
      sunAzimuthElevationEphemeris: {},
    });

    expect(endingEvents).toHaveLength(1);

    const endingEventCall =
      eclipseEventService.buildLunarEclipseEvent.mock.calls.at(-1)?.[0];

    expect(endingEventCall).toMatchObject({
      frame: "topocentric",
      phase: "ending",
    });
    expect(endingEventCall?.date).toBeDefined();

    eclipseGeometryService.getAllTopocentricVisibilities.mockReturnValueOnce({
      currentVisibility: { isLunarVisible: true, isSolarVisible: false },
      nextVisibility: { isLunarVisible: true, isSolarVisible: false },
      previousVisibility: { isLunarVisible: true, isSolarVisible: false },
    });

    eclipseEventService.buildLunarEclipseEvent.mockReturnValueOnce({
      categories: ["Eclipse", "Lunar"],
      description: "Lunar Eclipse maximum",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "Lunar max",
    } satisfies Event);

    const maximumEvents = service.getTopocentricEvents({
      currentCoordinates: lunarActiveCoordinates,
      lunarPhase: "maximum",
      minute: moment.utc("2024-03-21T12:02:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: lunarActiveCoordinates,
      previousCoordinates: lunarActiveCoordinates,
      solarPhase: "maximum",
      sunAzimuthElevationEphemeris: {},
    });

    expect(maximumEvents).toHaveLength(1);

    const maximumEventCall =
      eclipseEventService.buildLunarEclipseEvent.mock.calls.at(-1)?.[0];

    expect(maximumEventCall).toMatchObject({
      frame: "topocentric",
      phase: "maximum",
    });
    expect(maximumEventCall?.date).toBeDefined();
  });

  it("returns no events when topocentric activity is inactive", () => {
    eclipseGeometryService.getAllTopocentricVisibilities.mockReturnValueOnce({
      currentVisibility: { isLunarVisible: true, isSolarVisible: true },
      nextVisibility: { isLunarVisible: true, isSolarVisible: true },
      previousVisibility: { isLunarVisible: true, isSolarVisible: true },
    });

    const events = service.getTopocentricEvents({
      currentCoordinates: inactiveCoordinates,
      lunarPhase: "maximum",
      minute: moment.utc("2024-03-21T12:03:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: inactiveCoordinates,
      previousCoordinates: inactiveCoordinates,
      solarPhase: "maximum",
      sunAzimuthElevationEphemeris: {},
    });

    expect(events).toStrictEqual([]);
  });
});
