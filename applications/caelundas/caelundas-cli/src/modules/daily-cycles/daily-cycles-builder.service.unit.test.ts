import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CalendarService } from "../calendar/calendar.service";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { DailyCyclesBuilderService } from "./daily-cycles-builder.service";

describe(DailyCyclesBuilderService, () => {
  let service: DailyCyclesBuilderService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DailyCyclesBuilderService,
        { provide: CalendarService, useValue: createMock<CalendarService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: EphemerisService, useValue: createMock<EphemerisService>() },
      ],
    }).compile();

    service = await module.resolve(DailyCyclesBuilderService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
