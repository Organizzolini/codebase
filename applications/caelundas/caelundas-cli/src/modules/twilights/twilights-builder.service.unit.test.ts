import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { TwilightsBuilderService } from "./twilights-builder.service";

import type { Event } from "../calendar/calendar.types";

describe(TwilightsBuilderService, () => {
  let service: TwilightsBuilderService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TwilightsBuilderService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(TwilightsBuilderService);
    await module.resolve(LoggerService);
  });

  const beginningEvent: Event = {
    categories: ["Twilight"],
    description: "Beginning",
    end: moment.utc("2024-03-21T05:00:00.000Z"),
    start: moment.utc("2024-03-21T05:00:00.000Z"),
    summary: "Beginning",
  };
  const endingEvent: Event = {
    categories: ["Twilight"],
    description: "Ending",
    end: moment.utc("2024-03-21T06:00:00.000Z"),
    start: moment.utc("2024-03-21T06:00:00.000Z"),
    summary: "Ending",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("transition events", () => {
    it("builds Astronomical Dawn event", () => {
      expect.hasAssertions();

      const date = moment.utc("2024-03-21T05:00:00.000Z");
      const event = service.buildAstronomicalDawnEvent(date);

      expect(event.summary).toBe("🌠 Astronomical Dawn");
      expect(event.description).toBe("Astronomical Dawn");
      expect(event.categories).toContain("Astronomical Dawn");
    });

    it("builds Civil Dawn event", () => {
      expect.hasAssertions();

      const date = moment.utc("2024-03-21T06:00:00.000Z");
      const event = service.buildCivilDawnEvent(date);

      expect(event.summary).toBe("🌄 Civil Dawn");
      expect(event.description).toBe("Civil Dawn");
      expect(event.start).toStrictEqual(date);
      expect(event.end).toStrictEqual(date);
      expect(event.categories).toStrictEqual([
        "Astronomy",
        "Astrology",
        "Twilight",
        "Civil Dawn",
      ]);
    });

    it("builds Astronomical Dusk event", () => {
      expect.hasAssertions();

      const date = moment.utc("2024-03-21T20:00:00.000Z");
      const event = service.buildAstronomicalDuskEvent(date);

      expect(event.summary).toBe("🌌 Astronomical Dusk");
      expect(event.description).toBe("Astronomical Dusk");
      expect(event.categories).toContain("Twilight");
      expect(event.categories).toContain("Astronomical Dusk");
    });

    it("builds Civil Dusk event", () => {
      expect.hasAssertions();

      const date = moment.utc("2024-03-21T18:00:00.000Z");
      const event = service.buildCivilDuskEvent(date);

      expect(event.summary).toBe("🌇 Civil Dusk");
      expect(event.description).toBe("Civil Dusk");
      expect(event.categories).toContain("Civil Dusk");
    });

    it("builds Nautical Dawn event", () => {
      expect.hasAssertions();

      const date = moment.utc("2024-03-21T05:30:00.000Z");
      const event = service.buildNauticalDawnEvent(date);

      expect(event.summary).toBe("🌅 Nautical Dawn");
      expect(event.description).toBe("Nautical Dawn");
      expect(event.categories).toContain("Nautical Dawn");
    });

    it("builds Nautical Dusk event", () => {
      expect.hasAssertions();

      const date = moment.utc("2024-03-21T19:00:00.000Z");
      const event = service.buildNauticalDuskEvent(date);

      expect(event.summary).toBe("🌉 Nautical Dusk");
      expect(event.description).toBe("Nautical Dusk");
      expect(event.categories).toContain("Nautical Dusk");
    });
  });

  describe("duration events", () => {
    it("builds Daylight duration event", () => {
      expect.hasAssertions();

      const event = service.getDaylightDurationEvent(
        beginningEvent,
        endingEvent,
      );

      expect(event.summary).toBe("☀️ Daylight");
      expect(event.description).toBe("Daylight");
      expect(event.start).toStrictEqual(beginningEvent.start);
      expect(event.end).toStrictEqual(endingEvent.start);
      expect(event.categories).toContain("Daylight");
    });

    it("builds Night duration event", () => {
      expect.hasAssertions();

      const event = service.getNightDurationEvent(beginningEvent, endingEvent);

      expect(event.summary).toBe("🌃 Night");
      expect(event.description).toBe("Night");
      expect(event.categories).toContain("Night");
    });

    it("builds Astronomical Twilight (Morning) duration event", () => {
      expect.hasAssertions();

      const event = service.getAstronomicalTwilightMorningDurationEvent(
        beginningEvent,
        endingEvent,
      );

      expect(event.description).toBe("Astronomical Twilight (Morning)");
      expect(event.categories).toContain("Astronomical Twilight");
      expect(event.categories).toContain("Morning");
    });

    it("builds Astronomical Twilight (Evening) duration event", () => {
      expect.hasAssertions();

      const event = service.getAstronomicalTwilightEveningDurationEvent(
        beginningEvent,
        endingEvent,
      );

      expect(event.description).toBe("Astronomical Twilight (Evening)");
      expect(event.categories).toContain("Astronomical Twilight");
      expect(event.categories).toContain("Evening");
    });

    it("builds Nautical Twilight (Evening) duration event", () => {
      expect.hasAssertions();

      const event = service.getNauticalTwilightEveningDurationEvent(
        beginningEvent,
        endingEvent,
      );

      expect(event.description).toBe("Nautical Twilight (Evening)");
      expect(event.categories).toContain("Nautical Twilight");
      expect(event.categories).toContain("Evening");
    });
  });
});
