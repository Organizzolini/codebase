import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { AnnualSolarCycleService } from "../annual-solar-cycle/annual-solar-cycle.service";
import { AspectsService } from "../aspects/aspects.service";
import { DailyCyclesService } from "../daily-cycles/daily-cycles.service";
import { DatetimeService } from "../datetime/datetime.service";
import { EclipsesService } from "../eclipses/eclipses.service";
import { EphemerisService } from "../ephemeris/ephemeris.service";
import { IngressesService } from "../ingresses/ingresses.service";
import { MonthlyLunarCycleService } from "../monthly-lunar-cycle/monthly-lunar-cycle.service";
import { PhasesService } from "../phases/phases.service";
import { RetrogradesService } from "../retrogrades/retrogrades.service";
import { TwilightsService } from "../twilights/twilights.service";

import { PerfectiveService } from "./perfective.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { Input } from "../input/input.types";
import type {
  MartianPhaseEventArguments,
  MercurianPhaseEventArguments,
  VenusianPhaseEventArguments,
} from "../phases/phases.types";
import type { DeepMocked } from "@golevelup/ts-vitest";
import type { Moment } from "moment-timezone";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

const baseInput: Input = {
  end: moment.tz("2025-06-16", "America/New_York"),
  latitude: 39.9526,
  longitude: -75.1652,
  start: moment.tz("2025-06-15", "America/New_York"),
  timezone: "America/New_York",
};

const emptyEphemerides = {
  azimuthElevationEphemerisByBody: {} as never,
  coordinateEphemerisByBody: {} as never,
  distanceEphemerisByBody: {} as never,
  illuminationEphemerisByBody: {} as never,
};

describe(PerfectiveService, () => {
  let service: PerfectiveService;
  let mockLoggerService: DeepMocked<LoggerService>;

  const datetimeMock = {
    generateDates:
      vi.fn<
        (start: Moment, end: Moment, timezone: string) => Iterable<Moment>
      >(),
    generateMinutes: vi.fn<(start: Moment, end: Moment) => Iterable<Moment>>(),
  };
  const ephemerisAggMock = {
    getEphemerides: vi.fn<EphemerisService["getEphemerides"]>(),
  };
  const aspectsMock = {
    detect: vi.fn<AspectsService["detect"]>(),
    seed: vi.fn<AspectsService["seed"]>(() => ({
      aspectBodies: [],
      events: [],
    })),
  };
  const eclipsesMock = { detect: vi.fn<EclipsesService["detect"]>() };
  const retrogradesMock = { detect: vi.fn<RetrogradesService["detect"]>() };
  const ingressesMock = { detect: vi.fn<IngressesService["detect"]>() };
  const dailyCyclesMock = { detect: vi.fn<DailyCyclesService["detect"]>() };
  const monthlyLunarCycleMock = {
    detect: vi.fn<MonthlyLunarCycleService["detect"]>(),
    detectApsides: vi.fn<MonthlyLunarCycleService["detectApsides"]>(() => []),
  };
  const annualSolarCycleMock = {
    detect: vi.fn<AnnualSolarCycleService["detect"]>(),
  };
  const twilightsMock = { detect: vi.fn<TwilightsService["detect"]>() };
  const phasesMock = {
    getMartianPhaseEvents: vi.fn<
      (args: MartianPhaseEventArguments) => DetectedCalendarEvent[]
    >(() => []),
    getMercurianPhaseEvents: vi.fn<
      (args: MercurianPhaseEventArguments) => DetectedCalendarEvent[]
    >(() => []),
    getVenusianPhaseEvents: vi.fn<
      (args: VenusianPhaseEventArguments) => DetectedCalendarEvent[]
    >(() => []),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PerfectiveService,
        { provide: DatetimeService, useValue: datetimeMock },
        { provide: EphemerisService, useValue: ephemerisAggMock },
        { provide: AspectsService, useValue: aspectsMock },
        { provide: EclipsesService, useValue: eclipsesMock },
        { provide: RetrogradesService, useValue: retrogradesMock },
        { provide: IngressesService, useValue: ingressesMock },
        { provide: DailyCyclesService, useValue: dailyCyclesMock },
        { provide: MonthlyLunarCycleService, useValue: monthlyLunarCycleMock },
        { provide: AnnualSolarCycleService, useValue: annualSolarCycleMock },
        { provide: TwilightsService, useValue: twilightsMock },
        { provide: PhasesService, useValue: phasesMock },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(PerfectiveService);
    mockLoggerService = module.get(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detect", () => {
    it("returns an empty array when no dates are generated", () => {
      datetimeMock.generateDates.mockReturnValue([]);

      const result = service.detect(baseInput);

      expect(result).toStrictEqual([]);
    });

    it("returns an empty array when no minutes are generated within a day", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      datetimeMock.generateDates.mockReturnValue([date]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes.mockReturnValue([]);

      const result = service.detect(baseInput);

      expect(result).toStrictEqual([]);
    });

    it("requests ephemerides with MARGIN_MINUTES padding around the day", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      datetimeMock.generateDates.mockReturnValue([date]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes.mockReturnValue([]);

      service.detect(baseInput);

      expect(ephemerisAggMock.getEphemerides).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: [-75.1652, 39.9526],
          end: moment
            .tz("2025-06-15", "America/New_York")
            .endOf("day")
            .clone()
            .add(30, "minutes"),
          start: moment
            .tz("2025-06-15", "America/New_York")
            .startOf("day")
            .clone()
            .subtract(30, "minutes"),
          timezone: "America/New_York",
        }),
      );

      const firstCallArgument =
        ephemerisAggMock.getEphemerides.mock.calls[0]?.[0];

      expect(firstCallArgument?.end.isAfter(firstCallArgument.start)).toBe(
        true,
      );
    });

    it("accumulates events returned by sub-services across all minutes", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      const minute1 = date.clone().startOf("day");
      const minute2 = date.clone().startOf("day").add(1, "minute");
      const fakeEvent1 = { summary: "event-1" } as never;
      const fakeEvent2 = { summary: "event-2" } as never;

      datetimeMock.generateDates.mockReturnValue([date]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes.mockReturnValue([minute1, minute2]);

      aspectsMock.detect
        .mockReturnValueOnce({ aspectBodies: [], events: [fakeEvent1] })
        .mockReturnValueOnce({ aspectBodies: [], events: [fakeEvent2] });

      for (const subMock of [
        eclipsesMock,
        retrogradesMock,
        ingressesMock,
        dailyCyclesMock,
        monthlyLunarCycleMock,
        annualSolarCycleMock,
        twilightsMock,
      ]) {
        subMock.detect.mockReturnValue([]);
      }

      phasesMock.getMartianPhaseEvents.mockReturnValue([]);
      phasesMock.getMercurianPhaseEvents.mockReturnValue([]);
      phasesMock.getVenusianPhaseEvents.mockReturnValue([]);

      const result = service.detect(baseInput);

      expect(result).toContain(fakeEvent1);
      expect(result).toContain(fakeEvent2);
    });

    it("passes the Moon distance ephemeris to lunar apsis detection", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      const minute = date.clone().startOf("day");
      const moonDistanceEphemeris = {
        [minute.toISOString()]: { distance: 0.0025, distanceSpeed: 0 },
      };
      datetimeMock.generateDates.mockReturnValue([date]);
      datetimeMock.generateMinutes.mockReturnValue([minute]);
      ephemerisAggMock.getEphemerides.mockReturnValue({
        ...emptyEphemerides,
        distanceEphemerisByBody: { moon: moonDistanceEphemeris } as never,
      });
      aspectsMock.detect.mockReturnValue({ aspectBodies: [], events: [] });
      aspectsMock.seed.mockReturnValue({ aspectBodies: [], events: [] });
      for (const subMock of [
        eclipsesMock,
        retrogradesMock,
        ingressesMock,
        dailyCyclesMock,
        monthlyLunarCycleMock,
        annualSolarCycleMock,
        twilightsMock,
      ]) {
        subMock.detect.mockReturnValue([]);
      }

      service.detect(baseInput);

      expect(monthlyLunarCycleMock.detectApsides).toHaveBeenCalledWith({
        minute,
        moonDistanceEphemeris,
      });
    });

    it("seeds the aspect registry from the window's first minute, once", () => {
      const firstDate = moment.tz("2025-06-15", "America/New_York");
      const secondDate = moment.tz("2025-06-16", "America/New_York");
      const firstMinute = firstDate.clone().startOf("day");
      const secondDayMinute = secondDate.clone().startOf("day");
      const seededAspectBodies: AspectBodies[] = [
        { aspect: "square", bodies: ["mars", "pluto"] },
      ];
      const seededEvent = {
        categories: ["Astronomy", "Astrology", "Compound Aspect", "Forming"],
        description: "Mars, Mercury, Pluto t-square forming",
        end: firstMinute,
        start: firstMinute,
        summary: "seeded compound forming",
      } satisfies DetectedCalendarEvent;

      datetimeMock.generateDates.mockReturnValue([firstDate, secondDate]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes
        .mockReturnValueOnce([firstMinute])
        .mockReturnValueOnce([secondDayMinute]);
      aspectsMock.seed.mockReturnValueOnce({
        aspectBodies: seededAspectBodies,
        events: [seededEvent],
      });
      aspectsMock.detect.mockReturnValue({ aspectBodies: [], events: [] });
      for (const subMock of [
        eclipsesMock,
        retrogradesMock,
        ingressesMock,
        dailyCyclesMock,
        monthlyLunarCycleMock,
        annualSolarCycleMock,
        twilightsMock,
      ]) {
        subMock.detect.mockReturnValue([]);
      }

      const result = service.detect(baseInput);

      expect(aspectsMock.seed).toHaveBeenCalledExactlyOnceWith({
        coordinateEphemerisByBody: emptyEphemerides.coordinateEphemerisByBody,
        minute: firstMinute,
      });
      expect(aspectsMock.detect).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          minute: firstMinute,
          previousAspectBodies: seededAspectBodies,
        }),
      );
      expect(result).toStrictEqual([seededEvent]);
    });

    it("logs a completion summary with the total event count", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      datetimeMock.generateDates.mockReturnValue([date]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes.mockReturnValue([]);

      const result = service.detect(baseInput);

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        "🔭 Finished a perfective sweep",
        undefined,
        { events: result.length },
      );
    });
  });
});
