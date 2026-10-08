import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { getTrackCoordinates } from "../../../testing/eclipse-test.utilities";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { EclipseEventService } from "./eclipse-event.service";
import { EclipseGeometryService } from "./eclipse-geometry.service";
import { EclipseTopocentricService } from "./eclipse-topocentric.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";

describe(EclipseTopocentricService, () => {
  let service: EclipseTopocentricService;
  let eclipseGeometryService: EclipseGeometryService;
  let eclipseEventService: DeepMocked<EclipseEventService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EclipseTopocentricService,
        EclipseGeometryService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
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

  /** Mocks the next topocentric visibility sample. */
  function mockVisibilityOnce(
    visibilities: ReturnType<
      EclipseGeometryService["getAllTopocentricVisibilities"]
    >,
  ): void {
    vi.spyOn(
      eclipseGeometryService,
      "getAllTopocentricVisibilities",
    ).mockReturnValueOnce(visibilities);
  }

  const solarActiveCoordinates = getTrackCoordinates({
    alongTrack: 0.5,
    crossTrack: 0.2,
    kind: "solar",
  });

  const lunarActiveCoordinates = getTrackCoordinates({
    alongTrack: -0.5,
    crossTrack: 0.2,
    kind: "lunar",
  });

  const inactiveCoordinates = getTrackCoordinates({
    alongTrack: 90,
    crossTrack: 10,
    kind: "solar",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("treats penumbral contact as the edge of geocentric activity", () => {
    expect(
      service.isLunarEclipseActive(
        getTrackCoordinates({ alongTrack: 1.4, crossTrack: 0, kind: "lunar" }),
      ),
    ).toBe(true);
    expect(
      service.isLunarEclipseActive(
        getTrackCoordinates({ alongTrack: 1.6, crossTrack: 0, kind: "lunar" }),
      ),
    ).toBe(false);
    expect(
      service.isSolarEclipseActive(
        getTrackCoordinates({ alongTrack: 1.45, crossTrack: 0, kind: "solar" }),
      ),
    ).toBe(true);
    expect(
      service.isSolarEclipseActive(
        getTrackCoordinates({ alongTrack: 1.6, crossTrack: 0, kind: "solar" }),
      ),
    ).toBe(false);
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
    mockVisibilityOnce({
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
    } satisfies DetectedCalendarEvent);
    const events = service.getTopocentricEvents({
      currentCoordinates: solarActiveCoordinates,
      lunarEclipseType: "partial",
      lunarPhase: "beginning",
      minute: moment.utc("2024-03-21T12:00:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: solarActiveCoordinates,
      previousCoordinates: inactiveCoordinates,
      solarEclipseType: "hybrid",
      solarPhase: "beginning",
      sunAzimuthElevationEphemeris: {},
    });

    const firstSolarEventCall =
      eclipseEventService.buildSolarEclipseEvent.mock.calls[0]?.[0];

    expect(firstSolarEventCall).toMatchObject({
      frame: "topocentric",
      phase: "beginning",
      type: "hybrid",
    });
    expect(firstSolarEventCall?.date).toBeDefined();
    expect(eclipseEventService.buildLunarEclipseEvent).toHaveBeenCalledTimes(0);
    expect(events).toHaveLength(1);
  });

  it("builds ending and maximum lunar events when phase and visibility conditions match", () => {
    mockVisibilityOnce({
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
    } satisfies DetectedCalendarEvent);

    const endingEvents = service.getTopocentricEvents({
      currentCoordinates: lunarActiveCoordinates,
      lunarEclipseType: "partial",
      lunarPhase: "maximum",
      minute: moment.utc("2024-03-21T12:01:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: inactiveCoordinates,
      previousCoordinates: lunarActiveCoordinates,
      solarEclipseType: "hybrid",
      solarPhase: "maximum",
      sunAzimuthElevationEphemeris: {},
    });

    expect(endingEvents).toHaveLength(1);

    const endingEventCall =
      eclipseEventService.buildLunarEclipseEvent.mock.calls.at(-1)?.[0];

    expect(endingEventCall).toMatchObject({
      frame: "topocentric",
      phase: "ending",
      type: "partial",
    });
    expect(endingEventCall?.date).toBeDefined();

    mockVisibilityOnce({
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
    } satisfies DetectedCalendarEvent);

    const maximumEvents = service.getTopocentricEvents({
      currentCoordinates: lunarActiveCoordinates,
      lunarEclipseType: "partial",
      lunarPhase: "maximum",
      minute: moment.utc("2024-03-21T12:02:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: lunarActiveCoordinates,
      previousCoordinates: lunarActiveCoordinates,
      solarEclipseType: "hybrid",
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
    mockVisibilityOnce({
      currentVisibility: { isLunarVisible: true, isSolarVisible: true },
      nextVisibility: { isLunarVisible: true, isSolarVisible: true },
      previousVisibility: { isLunarVisible: true, isSolarVisible: true },
    });

    const events = service.getTopocentricEvents({
      currentCoordinates: inactiveCoordinates,
      lunarEclipseType: "partial",
      lunarPhase: "maximum",
      minute: moment.utc("2024-03-21T12:03:00.000Z"),
      moonAzimuthElevationEphemeris: {},
      nextCoordinates: inactiveCoordinates,
      previousCoordinates: inactiveCoordinates,
      solarEclipseType: "hybrid",
      solarPhase: "maximum",
      sunAzimuthElevationEphemeris: {},
    });

    expect(events).toStrictEqual([]);
  });
});
