import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProgressiveUtilitiesService } from "./progressive-utilities.service";

import type { Event } from "../calendar/calendar.types";

describe(ProgressiveUtilitiesService, () => {
  let service: ProgressiveUtilitiesService;
  let logger: DeepMocked<LoggerService>;

  const createEvent = (iso: string): Event => ({
    categories: ["Astronomy"],
    description: "Event",
    end: moment.utc(iso),
    start: moment.utc(iso),
    summary: "Event",
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProgressiveUtilitiesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(ProgressiveUtilitiesService);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("pairs matching beginnings and endings", () => {
    const beginning = createEvent("2024-03-21T10:00:00.000Z");
    const ending = createEvent("2024-03-21T12:00:00.000Z");

    const pairs = service.pairProgressiveEvents(
      [beginning],
      [ending],
      "matching",
    );

    expect(pairs).toStrictEqual([[beginning, ending]]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("warns on unequal counts and skips undefined pair entries", () => {
    const beginning = createEvent("2024-03-21T10:00:00.000Z");
    const ending = createEvent("2024-03-21T12:00:00.000Z");
    const extraEnding = createEvent("2024-03-21T13:00:00.000Z");
    const thirdEnding = createEvent("2024-03-21T14:00:00.000Z");

    const pairs = service.pairProgressiveEvents(
      [beginning, undefined as unknown as Event],
      [ending, extraEnding, thirdEnding],
      "unequal",
    );

    expect(pairs).toStrictEqual([[beginning, ending]]);
    expect(logger.warn).toHaveBeenCalledWith(
      "🔀 Mismatched progressive event counts",
      undefined,
      { beginnings: 2, endings: 3, label: "unequal" },
    );
  });
});
