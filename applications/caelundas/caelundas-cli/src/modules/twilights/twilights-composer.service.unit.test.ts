import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ProgressiveUtilitiesService } from "../progressive/progressive-utilities.service";

import { TwilightsBuilderService } from "./twilights-builder.service";
import { TwilightsComposerService } from "./twilights-composer.service";

import type { Event } from "../calendar/calendar.types";

describe(TwilightsComposerService, () => {
  let service: TwilightsComposerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TwilightsComposerService,
        TwilightsBuilderService,
        ProgressiveUtilitiesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(TwilightsComposerService);
    await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("pairAndBuild", () => {
    it("creates a daylight duration event from a matching pair", () => {
      const civilDawn: Event = {
        categories: ["Twilight", "Civil Dawn"],
        description: "Civil Dawn",
        end: moment.utc("2024-03-21T06:00:00.000Z"),
        start: moment.utc("2024-03-21T06:00:00.000Z"),
        summary: "Civil Dawn",
      };
      const civilDusk: Event = {
        categories: ["Twilight", "Civil Dusk"],
        description: "Civil Dusk",
        end: moment.utc("2024-03-21T19:00:00.000Z"),
        start: moment.utc("2024-03-21T19:00:00.000Z"),
        summary: "Civil Dusk",
      };

      const pairedEvents = service.pairAndBuild({
        beginnings: [civilDawn],
        builder: (beginning, ending) => ({
          categories: ["Twilight", "Daylight"],
          description: "Daylight",
          end: ending.start,
          start: beginning.start,
          summary: "Daylight",
        }),
        endings: [civilDusk],
        label: "Daylight",
      });

      expect(pairedEvents).toHaveLength(1);
      expect(pairedEvents[0]?.description).toBe("Daylight");
      expect(pairedEvents[0]?.start).toStrictEqual(civilDawn.start);
      expect(pairedEvents[0]?.end).toStrictEqual(civilDusk.start);
    });

    it("returns one pair when the counts differ", () => {
      const civilDawn: Event = {
        categories: ["Twilight", "Civil Dawn"],
        description: "Civil Dawn",
        end: moment.utc("2024-03-21T06:00:00.000Z"),
        start: moment.utc("2024-03-21T06:00:00.000Z"),
        summary: "Civil Dawn",
      };
      const civilDusk: Event = {
        categories: ["Twilight", "Civil Dusk"],
        description: "Civil Dusk",
        end: moment.utc("2024-03-21T19:00:00.000Z"),
        start: moment.utc("2024-03-21T19:00:00.000Z"),
        summary: "Civil Dusk",
      };

      const pairedEvents = service.pairAndBuild({
        beginnings: [civilDawn, civilDawn],
        builder: (beginning, ending) => ({
          categories: ["Twilight", "Daylight"],
          description: `${beginning.description} to ${ending.description}`,
          end: ending.start,
          start: beginning.start,
          summary: "Daylight",
        }),
        endings: [civilDusk],
        label: "Daylight",
      });

      expect(pairedEvents).toHaveLength(1);
      expect(pairedEvents[0]?.description).toBe("Civil Dawn to Civil Dusk");
    });
  });

  describe("dawn and dusk progressive composition", () => {
    it("creates morning twilight progressive events", () => {
      const astronomicalDawn: Event = {
        categories: ["Twilight", "Astronomical Dawn"],
        description: "Astronomical Dawn",
        end: moment.utc("2024-03-21T05:00:00.000Z"),
        start: moment.utc("2024-03-21T05:00:00.000Z"),
        summary: "Astronomical Dawn",
      };
      const nauticalDawn: Event = {
        categories: ["Twilight", "Nautical Dawn"],
        description: "Nautical Dawn",
        end: moment.utc("2024-03-21T05:30:00.000Z"),
        start: moment.utc("2024-03-21T05:30:00.000Z"),
        summary: "Nautical Dawn",
      };
      const civilDawn: Event = {
        categories: ["Twilight", "Civil Dawn"],
        description: "Civil Dawn",
        end: moment.utc("2024-03-21T06:00:00.000Z"),
        start: moment.utc("2024-03-21T06:00:00.000Z"),
        summary: "Civil Dawn",
      };

      const events = service.buildDawnProgressiveEvents(
        [astronomicalDawn],
        [nauticalDawn],
        [civilDawn],
      );

      expect(events).toHaveLength(2);
      expect(events.map((event) => event.description)).toContain(
        "Astronomical Twilight (Morning)",
      );
      expect(events.map((event) => event.description)).toContain(
        "Nautical Twilight (Morning)",
      );
    });

    it("creates evening twilight and daylight progressive events", () => {
      const civilDawn: Event = {
        categories: ["Twilight", "Civil Dawn"],
        description: "Civil Dawn",
        end: moment.utc("2024-03-21T06:00:00.000Z"),
        start: moment.utc("2024-03-21T06:00:00.000Z"),
        summary: "Civil Dawn",
      };
      const civilDusk: Event = {
        categories: ["Twilight", "Civil Dusk"],
        description: "Civil Dusk",
        end: moment.utc("2024-03-21T19:00:00.000Z"),
        start: moment.utc("2024-03-21T19:00:00.000Z"),
        summary: "Civil Dusk",
      };
      const nauticalDusk: Event = {
        categories: ["Twilight", "Nautical Dusk"],
        description: "Nautical Dusk",
        end: moment.utc("2024-03-21T19:30:00.000Z"),
        start: moment.utc("2024-03-21T19:30:00.000Z"),
        summary: "Nautical Dusk",
      };
      const astronomicalDusk: Event = {
        categories: ["Twilight", "Astronomical Dusk"],
        description: "Astronomical Dusk",
        end: moment.utc("2024-03-21T20:00:00.000Z"),
        start: moment.utc("2024-03-21T20:00:00.000Z"),
        summary: "Astronomical Dusk",
      };

      const events = service.buildDuskProgressiveEvents({
        astronomicalDuskEvents: [astronomicalDusk],
        civilDawnEvents: [civilDawn],
        civilDuskEvents: [civilDusk],
        nauticalDuskEvents: [nauticalDusk],
      });

      expect(events).toHaveLength(3);
      expect(events.map((event) => event.description)).toContain("Daylight");
      expect(events.map((event) => event.description)).toContain(
        "Nautical Twilight (Evening)",
      );
      expect(events.map((event) => event.description)).toContain(
        "Astronomical Twilight (Evening)",
      );
    });
  });
});
