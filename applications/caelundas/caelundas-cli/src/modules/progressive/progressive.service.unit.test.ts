import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AnnualSolarCycleService } from "../annual-solar-cycle/annual-solar-cycle.service";
import { AspectsService } from "../aspects/aspects.service";
import { EclipsesService } from "../eclipses/eclipses.service";
import { IngressesService } from "../ingresses/ingresses.service";
import { MonthlyLunarCycleService } from "../monthly-lunar-cycle/monthly-lunar-cycle.service";
import { PhasesService } from "../phases/phases.service";
import { RetrogradesService } from "../retrogrades/retrogrades.service";
import { TwilightsService } from "../twilights/twilights.service";

import { ProgressiveUtilitiesService } from "./progressive-utilities.service";
import { ProgressiveService } from "./progressive.service";

import type { Event } from "../calendar/calendar.types";

function makeEvent(summary: string): Event {
  return {
    categories: [],
    description: summary,
    end: moment.utc("2025-06-15T12:00:00Z"),
    start: moment.utc("2025-06-15T12:00:00Z"),
    summary,
  };
}

describe(ProgressiveService, () => {
  let service: ProgressiveService;
  let utilitiesService: ProgressiveUtilitiesService;

  const annualSolarCycleMock = {
    detectProgressive: vi.fn<AnnualSolarCycleService["detectProgressive"]>(),
  };
  const aspectsMock = {
    detectProgressive: vi.fn<AspectsService["detectProgressive"]>(),
  };
  const eclipsesMock = {
    detectProgressive: vi.fn<EclipsesService["detectProgressive"]>(),
  };
  const ingressesMock = {
    detectProgressive: vi.fn<IngressesService["detectProgressive"]>(),
  };
  const monthlyLunarCycleMock = {
    detectProgressive: vi.fn<MonthlyLunarCycleService["detectProgressive"]>(),
  };
  const phasesMock = {
    detectProgressive: vi.fn<PhasesService["detectProgressive"]>(),
  };
  const retrogradesMock = {
    detectProgressive: vi.fn<RetrogradesService["detectProgressive"]>(),
  };
  const twilightsMock = {
    detectProgressive: vi.fn<TwilightsService["detectProgressive"]>(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoggerService,
        ProgressiveService,
        { provide: AnnualSolarCycleService, useValue: annualSolarCycleMock },
        { provide: AspectsService, useValue: aspectsMock },
        { provide: EclipsesService, useValue: eclipsesMock },
        { provide: IngressesService, useValue: ingressesMock },
        { provide: MonthlyLunarCycleService, useValue: monthlyLunarCycleMock },
        { provide: PhasesService, useValue: phasesMock },
        { provide: RetrogradesService, useValue: retrogradesMock },
        { provide: TwilightsService, useValue: twilightsMock },
        ProgressiveUtilitiesService,
      ],
    }).compile();

    service = await module.resolve(ProgressiveService);
    utilitiesService = await module.resolve(ProgressiveUtilitiesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detect", () => {
    it("returns an empty array when all sub-services return nothing", () => {
      for (const subMock of [
        annualSolarCycleMock,
        aspectsMock,
        eclipsesMock,
        ingressesMock,
        monthlyLunarCycleMock,
        phasesMock,
        retrogradesMock,
        twilightsMock,
      ]) {
        subMock.detectProgressive.mockReturnValue([]);
      }

      const result = service.detect([]);

      expect(result).toStrictEqual([]);
    });

    it("aggregates events from all sub-services into a single flat array", () => {
      const aspectEvent = makeEvent("aspect");
      const retrogradeEvent = makeEvent("retrograde");
      const eclipseEvent = makeEvent("eclipse");

      aspectsMock.detectProgressive.mockReturnValue([aspectEvent]);
      retrogradesMock.detectProgressive.mockReturnValue([retrogradeEvent]);
      eclipsesMock.detectProgressive.mockReturnValue([eclipseEvent]);
      ingressesMock.detectProgressive.mockReturnValue([]);
      monthlyLunarCycleMock.detectProgressive.mockReturnValue([]);
      twilightsMock.detectProgressive.mockReturnValue([]);
      phasesMock.detectProgressive.mockReturnValue([]);
      annualSolarCycleMock.detectProgressive.mockReturnValue([]);

      const result = service.detect([]);

      expect(result).toContain(aspectEvent);
      expect(result).toContain(retrogradeEvent);
      expect(result).toContain(eclipseEvent);
      expect(result).toHaveLength(3);
    });

    it("forwards the perfective events array to every sub-service", () => {
      const perfectiveEvents = [makeEvent("perfective")];

      for (const subMock of [
        annualSolarCycleMock,
        aspectsMock,
        eclipsesMock,
        ingressesMock,
        monthlyLunarCycleMock,
        phasesMock,
        retrogradesMock,
        twilightsMock,
      ]) {
        subMock.detectProgressive.mockReturnValue([]);
      }

      service.detect(perfectiveEvents);

      for (const subMock of [
        annualSolarCycleMock,
        aspectsMock,
        eclipsesMock,
        ingressesMock,
        monthlyLunarCycleMock,
        phasesMock,
        retrogradesMock,
        twilightsMock,
      ]) {
        expect(subMock.detectProgressive).toHaveBeenCalledWith(
          perfectiveEvents,
        );
      }
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("pairProgressiveEvents", () => {
    it("returns an empty array when both inputs are empty", () => {
      const result = utilitiesService.pairProgressiveEvents([], [], "test");

      expect(result).toStrictEqual([]);
    });

    it("pairs beginnings with their corresponding endings", () => {
      const beginning1 = makeEvent("beginning-1");
      const ending1 = makeEvent("ending-1");
      const beginning2 = makeEvent("beginning-2");
      const ending2 = makeEvent("ending-2");

      const result = utilitiesService.pairProgressiveEvents(
        [beginning1, beginning2],
        [ending1, ending2],
        "test",
      );

      expect(result).toStrictEqual([
        [beginning1, ending1],
        [beginning2, ending2],
      ]);
    });

    it("truncates to the shorter list when counts differ", () => {
      const beginning1 = makeEvent("beginning-1");
      const beginning2 = makeEvent("beginning-2");
      const ending1 = makeEvent("ending-1");

      const result = utilitiesService.pairProgressiveEvents(
        [beginning1, beginning2],
        [ending1],
        "test",
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toStrictEqual([beginning1, ending1]);
    });

    it("emits a console warning when beginning and ending counts differ", () => {
      const warnSpy = vi
        .spyOn(LoggerService.prototype, "warn")
        .mockReturnValue(undefined);

      utilitiesService.pairProgressiveEvents(
        [makeEvent("a"), makeEvent("b")],
        [makeEvent("c")],
        "my-label",
      );

      expect(warnSpy).toHaveBeenCalledWith(
        "🔀 Mismatched progressive event counts",
        undefined,
        { beginnings: 2, endings: 1, label: "my-label" },
      );

      warnSpy.mockRestore();
    });

    it("does not warn when counts are equal", () => {
      const warnSpy = vi
        .spyOn(LoggerService.prototype, "warn")
        .mockReturnValue(undefined);

      utilitiesService.pairProgressiveEvents(
        [makeEvent("a")],
        [makeEvent("b")],
        "test",
      );

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
