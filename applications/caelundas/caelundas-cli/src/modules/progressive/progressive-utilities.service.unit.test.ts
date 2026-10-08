import { createMock, type DeepMocked } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { ProgressiveUtilitiesService } from "./progressive-utilities.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";

describe(ProgressiveUtilitiesService, () => {
  let service: ProgressiveUtilitiesService;
  let logger: DeepMocked<LoggerService>;

  const createEvent = (iso: string): DetectedCalendarEvent => ({
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

  it("warns on unequal counts and pairs only what it can", () => {
    const beginning = createEvent("2024-03-21T10:00:00.000Z");
    const ending = createEvent("2024-03-21T12:00:00.000Z");
    const extraEnding = createEvent("2024-03-21T13:00:00.000Z");
    const thirdEnding = createEvent("2024-03-21T14:00:00.000Z");

    const pairs = service.pairProgressiveEvents(
      [beginning],
      [ending, extraEnding, thirdEnding],
      "unequal",
    );

    expect(pairs).toStrictEqual([[beginning, ending]]);
    expect(logger.warn).toHaveBeenCalledWith(
      "🔀 Mismatched progressive event counts",
      undefined,
      { beginnings: 1, endings: 3, label: "unequal" },
    );
  });

  it("drops endings that come before the first beginning", () => {
    const strayEnding = createEvent("2026-03-19T10:00:00.000Z");
    const beginning = createEvent("2026-03-19T23:00:00.000Z");
    const ending = createEvent("2026-03-20T10:00:00.000Z");

    const pairs = service.pairProgressiveEvents(
      [beginning],
      [strayEnding, ending],
      "window opens mid-occurrence",
    );

    expect(pairs).toStrictEqual([[beginning, ending]]);
  });

  it("pairs each beginning with the earliest ending after it", () => {
    const endings = [
      createEvent("2026-03-19T10:00:00.000Z"),
      createEvent("2026-03-20T10:00:00.000Z"),
      createEvent("2026-03-21T10:00:00.000Z"),
    ];
    const beginnings = [
      createEvent("2026-03-19T23:00:00.000Z"),
      createEvent("2026-03-20T23:00:00.000Z"),
      createEvent("2026-03-21T23:00:00.000Z"),
    ];

    const pairs = service.pairProgressiveEvents(beginnings, endings, "night");

    expect(pairs).toStrictEqual([
      [beginnings[0], endings[1]],
      [beginnings[1], endings[2]],
    ]);
  });

  it("pairs by time whatever order the lists arrive in", () => {
    const firstBeginning = createEvent("2026-01-01T00:00:00.000Z");
    const firstEnding = createEvent("2026-01-02T00:00:00.000Z");
    const secondBeginning = createEvent("2026-02-01T00:00:00.000Z");
    const secondEnding = createEvent("2026-02-02T00:00:00.000Z");

    const pairs = service.pairProgressiveEvents(
      [secondBeginning, firstBeginning],
      [secondEnding, firstEnding],
      "unordered",
    );

    expect(pairs).toStrictEqual([
      [firstBeginning, firstEnding],
      [secondBeginning, secondEnding],
    ]);
  });

  it("never pairs an ending with more than one beginning", () => {
    const firstBeginning = createEvent("2026-01-01T00:00:00.000Z");
    const secondBeginning = createEvent("2026-01-01T06:00:00.000Z");
    const ending = createEvent("2026-01-02T00:00:00.000Z");

    const pairs = service.pairProgressiveEvents(
      [firstBeginning, secondBeginning],
      [ending],
      "missing ending",
    );

    expect(pairs).toStrictEqual([[firstBeginning, ending]]);
  });

  it("never emits a span that ends before it starts", () => {
    const beginnings = [
      createEvent("2026-07-01T00:00:00.000Z"),
      createEvent("2026-10-24T00:00:00.000Z"),
    ];
    const endings = [
      createEvent("2026-06-15T00:00:00.000Z"),
      createEvent("2026-07-23T00:00:00.000Z"),
    ];

    const pairs = service.pairProgressiveEvents(beginnings, endings, "spans");

    for (const [beginning, ending] of pairs) {
      expect(ending.start.valueOf()).toBeGreaterThanOrEqual(
        beginning.start.valueOf(),
      );
    }

    expect(pairs).toStrictEqual([[beginnings[0], endings[1]]]);
  });

  it("warns when an occurrence is left unpaired even though counts match", () => {
    const strayEnding = createEvent("2026-07-23T00:00:00.000Z");
    const strayBeginning = createEvent("2026-10-24T00:00:00.000Z");

    const pairs = service.pairProgressiveEvents(
      [strayBeginning],
      [strayEnding],
      "Mercury retrograde",
    );

    expect(pairs).toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      "🔀 Mismatched progressive event counts",
      undefined,
      { beginnings: 1, endings: 1, label: "Mercury retrograde" },
    );
  });
});
