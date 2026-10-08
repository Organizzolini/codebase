import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { CalendarEvent } from "../caelundas-database/entities/calendar-event.entity";

import { CalendarEventsService } from "./calendar-events.service";

describe(CalendarEventsService, () => {
  let service: CalendarEventsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CalendarEventsService,
        LoggerService,
        { provide: getRepositoryToken(CalendarEvent), useValue: {} },
      ],
    }).compile();

    service = await module.resolve(CalendarEventsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
