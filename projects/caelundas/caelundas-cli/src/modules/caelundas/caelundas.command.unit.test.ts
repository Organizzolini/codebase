import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { CalendarEventsService } from "../calendar-events/calendar-events.service";
import { CalendarService } from "../calendar/calendar.service";
import { InputService } from "../input/input.service";
import { PerfectiveService } from "../perfective/perfective.service";
import { ProgressiveService } from "../progressive/progressive.service";

import { CaelundasCommand } from "./caelundas.command";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { CalendarEvent } from "../caelundas-database/entities/calendar-event.entity";
import type { Input } from "../input/input.types";

const input: Input = {
  end: moment.utc("2026-02-01T00:00:00Z"),
  latitude: 40.7128,
  longitude: -74.006,
  start: moment.utc("2026-01-01T00:00:00Z"),
  timezone: "America/New_York",
};

function detectedEvent(summary: string, start: string): DetectedCalendarEvent {
  return {
    categories: ["aspects"],
    description: summary,
    end: moment.utc(start),
    start: moment.utc(start),
    summary,
  };
}

function storedEvent(summary: string, start: string): CalendarEvent {
  return {
    ...detectedEvent(summary, start),
    createdAt: new Date(start),
    id: "0192f0c4-5b1e-7c66-8a3d-2f4e6b8c9d10",
    latitude: "40.712800",
    longitude: "-74.006000",
    updatedAt: new Date(start),
  };
}

describe(CaelundasCommand, () => {
  const callOrder: string[] = [];
  const calendarService = createMock<CalendarService>();
  const calendarEventsService = createMock<CalendarEventsService>();
  const perfectiveService = createMock<PerfectiveService>();
  const progressiveService = createMock<ProgressiveService>();
  const inputService = createMock<InputService>();
  let command: CaelundasCommand;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CaelundasCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: InputService, useValue: inputService },
        { provide: PerfectiveService, useValue: perfectiveService },
        { provide: ProgressiveService, useValue: progressiveService },
        { provide: CalendarService, useValue: calendarService },
        { provide: CalendarEventsService, useValue: calendarEventsService },
      ],
    }).compile();

    command = await module.resolve(CaelundasCommand);
  });

  beforeEach(() => {
    callOrder.length = 0;
    vi.clearAllMocks();
    inputService.parse.mockReturnValue(input);
    perfectiveService.detect.mockImplementation(() => {
      callOrder.push("detect");
      return [
        detectedEvent("Later", "2026-01-20T00:00:00Z"),
        detectedEvent("Earlier", "2026-01-10T00:00:00Z"),
      ];
    });
    progressiveService.detect.mockReturnValue([
      detectedEvent("Middle", "2026-01-15T00:00:00Z"),
    ]);
    calendarEventsService.upsert.mockImplementation(async () => {
      callOrder.push("upsert");
      await Promise.resolve();
    });
    calendarEventsService.findInRange.mockImplementation(async () => {
      callOrder.push("findInRange");
      await Promise.resolve();
      return [storedEvent("Stored", "2026-01-12T00:00:00Z")];
    });
    calendarService.write.mockImplementation(async () => {
      callOrder.push("write");
      await Promise.resolve();
    });
    calendarService.writeJson.mockImplementation(async () => {
      callOrder.push("writeJson");
      await Promise.resolve();
    });
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        CaelundasCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        { provide: InputService, useValue: inputService },
        { provide: PerfectiveService, useValue: perfectiveService },
        { provide: ProgressiveService, useValue: progressiveService },
        { provide: CalendarService, useValue: calendarService },
        { provide: CalendarEventsService, useValue: calendarEventsService },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CaelundasCommand");
  });

  describe("run", () => {
    it("detects, upserts, reads back, then writes both files", async () => {
      await command.run();

      expect(callOrder).toStrictEqual([
        "detect",
        "upsert",
        "findInRange",
        "write",
        "writeJson",
      ]);
    });

    it("upserts every detected event, sorted by start, for the input location", async () => {
      await command.run();

      const [events, coordinates] =
        calendarEventsService.upsert.mock.calls[0] ?? [];

      expect(events?.map((event) => event.summary)).toStrictEqual([
        "Earlier",
        "Middle",
        "Later",
      ]);
      expect(coordinates).toStrictEqual({
        latitude: input.latitude,
        longitude: input.longitude,
      });
    });

    it("reads back the input's range and location", async () => {
      await command.run();

      expect(calendarEventsService.findInRange).toHaveBeenCalledExactlyOnceWith(
        {
          end: input.end.clone().add(1, "day"),
          latitude: input.latitude,
          longitude: input.longitude,
          start: input.start,
        },
      );
    });

    it("renders the stored rows, not the detected events", async () => {
      await command.run();

      const [written] = calendarService.write.mock.calls[0] ?? [];
      const [writtenJson] = calendarService.writeJson.mock.calls[0] ?? [];

      expect(written?.map((event) => event.summary)).toStrictEqual(["Stored"]);
      expect(writtenJson?.map((event) => event.summary)).toStrictEqual([
        "Stored",
      ]);
    });

    it("handles no detected events", async () => {
      perfectiveService.detect.mockReturnValue([]);
      progressiveService.detect.mockReturnValue([]);
      calendarEventsService.findInRange.mockResolvedValue([]);

      await command.run();

      expect(calendarService.write).toHaveBeenCalledExactlyOnceWith([], input);
    });
  });
});
