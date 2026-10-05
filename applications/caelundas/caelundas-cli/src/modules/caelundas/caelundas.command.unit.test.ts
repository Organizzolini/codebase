import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CalendarService } from "../calendar/calendar.service";
import { InputService } from "../input/input.service";
import { PerfectiveService } from "../perfective/perfective.service";
import { ProgressiveService } from "../progressive/progressive.service";

import { CaelundasCommand } from "./caelundas.command";

interface EventWithStart {
  start: {
    valueOf: () => number;
  };
  type?: string;
}

interface ParsedInputShape {
  end: {
    valueOf: () => number;
  };
  latitude: number;
  longitude: number;
  start: {
    valueOf: () => number;
  };
  timezone: string;
}

const getWriteCallArguments = (
  calendarService: CalendarService,
): [EventWithStart[], ParsedInputShape] => {
  const calendarServiceMock = calendarService as unknown as {
    write: {
      mock: {
        calls: [EventWithStart[], ParsedInputShape][];
      };
    };
  };

  const firstCall = calendarServiceMock.write.mock.calls[0];

  if (firstCall === undefined) {
    throw new Error("Expected calendarService.write to be called once");
  }

  return firstCall;
};

describe(CaelundasCommand, () => {
  let command: CaelundasCommand;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CaelundasCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: InputService, useValue: createMock<InputService>() },
        {
          provide: PerfectiveService,
          useValue: createMock<PerfectiveService>(),
        },
        {
          provide: ProgressiveService,
          useValue: createMock<ProgressiveService>(),
        },
        { provide: CalendarService, useValue: createMock<CalendarService>() },
      ],
    }).compile();

    command = await module.resolve(CaelundasCommand);
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
        {
          provide: InputService,
          useValue: createMock<InputService>(),
        },
        {
          provide: PerfectiveService,
          useValue: createMock<PerfectiveService>(),
        },
        {
          provide: ProgressiveService,
          useValue: createMock<ProgressiveService>(),
        },
        {
          provide: CalendarService,
          useValue: createMock<CalendarService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CaelundasCommand");
  });

  describe("run", () => {
    it("orchestrates the complete calendar generation pipeline", async () => {
      const mockInput = {
        end: { valueOf: () => 2000 },
        latitude: 40.7128,
        longitude: -74.006,
        start: { valueOf: () => 1000 },
        timezone: "America/New_York",
      };

      const mockPerfectiveEvents = [
        { start: { valueOf: () => 1100 } },
        { start: { valueOf: () => 1500 } },
      ];

      const mockProgressiveEvents = [{ start: { valueOf: () => 1200 } }];

      const module = await Test.createTestingModule({
        providers: [
          CaelundasCommand,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: InputService,
            useValue: createMock<InputService>({
              parse: () => mockInput,
            }),
          },
          {
            provide: PerfectiveService,
            useValue: createMock<PerfectiveService>({
              detect: () => mockPerfectiveEvents,
            }),
          },
          {
            provide: ProgressiveService,
            useValue: createMock<ProgressiveService>({
              detect: () => mockProgressiveEvents,
            }),
          },
          {
            provide: CalendarService,
            useValue: createMock<CalendarService>({
              write: async () => {
                await Promise.resolve();
              },
            }),
          },
        ],
      }).compile();

      const resolvedCommand = await module.resolve(CaelundasCommand);
      const inputService = await module.resolve(InputService);
      const perfectiveService = await module.resolve(PerfectiveService);
      const progressiveService = await module.resolve(ProgressiveService);
      const calendarService = await module.resolve(CalendarService);

      await resolvedCommand.run();

      expect(inputService.parse).toHaveBeenCalledWith();
      expect(perfectiveService.detect).toHaveBeenCalledWith(mockInput);
      expect(progressiveService.detect).toHaveBeenCalledWith(
        mockPerfectiveEvents,
      );
      expect(calendarService.write).toHaveBeenCalledExactlyOnceWith(
        expect.any(Array),
        mockInput,
      );

      const [writtenEvents, writtenInput] =
        getWriteCallArguments(calendarService);

      expect(writtenEvents.map((event) => event.start.valueOf())).toStrictEqual(
        [1100, 1200, 1500],
      );
      expect(writtenInput).toBe(mockInput);
    });

    it("sorts events by start time before writing to calendar", async () => {
      const mockInput = {
        end: { valueOf: () => 2000 },
        latitude: 40,
        longitude: -74,
        start: { valueOf: () => 1000 },
        timezone: "America/New_York",
      };

      const mockEvents = [
        { start: { valueOf: () => 1500 } },
        { start: { valueOf: () => 1100 } },
        { start: { valueOf: () => 1300 } },
      ];

      const module = await Test.createTestingModule({
        providers: [
          CaelundasCommand,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: InputService,
            useValue: createMock<InputService>({
              parse: () => mockInput,
            }),
          },
          {
            provide: PerfectiveService,
            useValue: createMock<PerfectiveService>({
              detect: () => mockEvents,
            }),
          },
          {
            provide: ProgressiveService,
            useValue: createMock<ProgressiveService>({
              detect: () => [],
            }),
          },
          {
            provide: CalendarService,
            useValue: createMock<CalendarService>({
              write: async () => {
                await Promise.resolve();
              },
            }),
          },
        ],
      }).compile();

      const resolvedCommand = await module.resolve(CaelundasCommand);
      const calendarService = await module.resolve(CalendarService);

      await resolvedCommand.run();

      const [writtenEvents] = getWriteCallArguments(calendarService);

      expect(writtenEvents.map((event) => event.start.valueOf())).toStrictEqual(
        [1100, 1300, 1500],
      );
    });

    it("handles both perfective and progressive events when present", async () => {
      const mockInput = {
        end: { valueOf: () => 2000 },
        latitude: 40,
        longitude: -74,
        start: { valueOf: () => 1000 },
        timezone: "America/New_York",
      };

      const perfectiveEvents = [
        { start: { valueOf: () => 1200 }, type: "perfective" },
      ];

      const progressiveEvents = [
        { start: { valueOf: () => 1300 }, type: "progressive" },
      ];

      const module = await Test.createTestingModule({
        providers: [
          CaelundasCommand,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: InputService,
            useValue: createMock<InputService>({
              parse: () => mockInput,
            }),
          },
          {
            provide: PerfectiveService,
            useValue: createMock<PerfectiveService>({
              detect: () => perfectiveEvents,
            }),
          },
          {
            provide: ProgressiveService,
            useValue: createMock<ProgressiveService>({
              detect: () => progressiveEvents,
            }),
          },
          {
            provide: CalendarService,
            useValue: createMock<CalendarService>({
              write: async () => {
                await Promise.resolve();
              },
            }),
          },
        ],
      }).compile();

      const resolvedCommand = await module.resolve(CaelundasCommand);
      const calendarService = await module.resolve(CalendarService);

      await resolvedCommand.run();

      const [writtenEvents] = getWriteCallArguments(calendarService);

      expect(writtenEvents).toHaveLength(2);
      expect(writtenEvents).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "perfective" }),
          expect.objectContaining({ type: "progressive" }),
        ]),
      );
    });

    it("handles empty event lists gracefully", async () => {
      const mockInput = {
        end: { valueOf: () => 2000 },
        latitude: 40,
        longitude: -74,
        start: { valueOf: () => 1000 },
        timezone: "America/New_York",
      };

      const module = await Test.createTestingModule({
        providers: [
          CaelundasCommand,
          {
            provide: LoggerService,
            useValue: createMock<LoggerService>(),
          },
          {
            provide: InputService,
            useValue: createMock<InputService>({
              parse: () => mockInput,
            }),
          },
          {
            provide: PerfectiveService,
            useValue: createMock<PerfectiveService>({
              detect: () => [],
            }),
          },
          {
            provide: ProgressiveService,
            useValue: createMock<ProgressiveService>({
              detect: () => [],
            }),
          },
          {
            provide: CalendarService,
            useValue: createMock<CalendarService>({
              write: async () => {
                await Promise.resolve();
              },
            }),
          },
        ],
      }).compile();

      const resolvedCommand = await module.resolve(CaelundasCommand);
      const calendarService = await module.resolve(CalendarService);

      await resolvedCommand.run();

      expect(calendarService.write).toHaveBeenCalledWith([], mockInput);
    });
  });
});
