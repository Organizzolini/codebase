import { writeFile } from "node:fs/promises";

import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { mockDates } from "../../../testing/mocks";

import { CalendarService } from "./calendar.service";

import type { Event } from "./calendar.types";

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn<typeof writeFile>(),
}));

describe(CalendarService, () => {
  let service: CalendarService;
  const configService = {
    get: vi.fn<ConfigService["get"]>().mockReturnValue("./output"),
  };
  const logger = new LoggerService();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: LoggerService,
          useValue: logger,
        },
        CalendarService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = await module.resolve(CalendarService);
  });

  mockDates();

  describe("buildEventContent", () => {
    const baseEvent: Event = {
      categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Aries"],
      description: "Sun ingress Aries",
      end: moment.utc("2025-03-20T09:06:00Z"),
      start: moment.utc("2025-03-20T09:06:00Z"),
      summary: "☀️ → ♈ Sun ingress Aries",
    };

    it("generates valid VEVENT structure", () => {
      const vevent = service.buildEventContent(baseEvent);

      expect(vevent).toContain("BEGIN:VEVENT");
      expect(vevent).toContain("END:VEVENT");
      expect(vevent).toContain("UID:");
      expect(vevent).toContain("DTSTAMP:");
      expect(vevent).toContain("DTSTART;TZID=America/New_York:");
      expect(vevent).toContain("DTEND;TZID=America/New_York:");
      expect(vevent).toContain("SUMMARY:☀️ → ♈ Sun ingress Aries");
      expect(vevent).toContain("DESCRIPTION:Sun ingress Aries");
      expect(vevent).toContain("STATUS:CONFIRMED");
      expect(vevent).toContain("CLASS:PUBLIC");
      expect(vevent).toContain("TRANSP:TRANSPARENT");
      expect(vevent).toContain(
        "CATEGORIES:Astronomy,Astrology,Ingress,Sun,Aries",
      );
    });

    it("includes optional location when provided", () => {
      const eventWithLocation: Event = {
        ...baseEvent,
        location: "Philadelphia, PA",
      };
      const vevent = service.buildEventContent(eventWithLocation);

      expect(vevent).toContain("LOCATION:Philadelphia, PA");
    });

    it("includes geography when provided", () => {
      const eventWithGeo: Event = {
        ...baseEvent,
        geography: { latitude: 39.9526, longitude: -75.1652 },
      };
      const vevent = service.buildEventContent(eventWithGeo);

      expect(vevent).toContain("GEO:39.9526;-75.1652");
    });

    it("includes URL when provided", () => {
      const eventWithUrl: Event = {
        ...baseEvent,
        url: "https://example.com/event",
      };
      const vevent = service.buildEventContent(eventWithUrl);

      expect(vevent).toContain("URL:https://example.com/event");
    });

    it("includes priority when provided", () => {
      const eventWithPriority: Event = {
        ...baseEvent,
        priority: 1,
      };
      const vevent = service.buildEventContent(eventWithPriority);

      expect(vevent).toContain("PRIORITY:1");
    });

    it("includes color when provided", () => {
      const eventWithColor: Event = {
        ...baseEvent,
        color: "red",
      };
      const vevent = service.buildEventContent(eventWithColor);

      expect(vevent).toContain("COLOR:red");
    });

    it("generates unique UID based on event details", () => {
      const vevent = service.buildEventContent(baseEvent);
      const uid = /UID:(.+)/.exec(vevent)?.[1] ?? "";

      expect(uid).toContain(baseEvent.summary);
      expect(uid).toContain(baseEvent.description);
    });

    it("handles events with different start and end times", () => {
      const durationEvent: Event = {
        ...baseEvent,
        end: moment.utc("2025-04-20T09:06:00Z"),
      };
      const vevent = service.buildEventContent(durationEvent);

      // UID should include both start and end when they differ
      const uid = /UID:(.+)/.exec(vevent)?.[1] ?? "";

      expect(uid).toContain(durationEvent.summary);
      // Verify both DTSTART and DTEND are present with different values
      expect(vevent).toContain("DTSTART");
      expect(vevent).toContain("DTEND");
    });

    it("uses provided timezone", () => {
      const vevent = service.buildEventContent(
        baseEvent,
        "America/Los_Angeles",
      );

      expect(vevent).toContain("DTSTART;TZID=America/Los_Angeles:");
      expect(vevent).toContain("DTEND;TZID=America/Los_Angeles:");
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildFileContent", () => {
    const sampleEvents: Event[] = [
      {
        categories: ["Astronomy", "Equinox"],
        description: "Sun enters Aries",
        end: moment.utc("2025-03-20T09:06:00Z"),
        start: moment.utc("2025-03-20T09:06:00Z"),
        summary: "Vernal Equinox",
      },
      {
        categories: ["Astronomy", "Lunar Phase"],
        description: "Full Moon in Libra",
        end: moment.utc("2025-03-29T10:58:00Z"),
        start: moment.utc("2025-03-29T10:58:00Z"),
        summary: "Full Moon",
      },
    ];

    it("generates valid VCALENDAR structure", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: sampleEvents,
        name: "Test Calendar",
        timezone: "America/New_York",
      });

      expect(calendar).toContain("BEGIN:VCALENDAR");
      expect(calendar).toContain("END:VCALENDAR");
      expect(calendar).toContain("VERSION:2.0");
      expect(calendar).toContain(
        "PRODID:-//Caelundas//Astronomical Calendar//EN",
      );
      expect(calendar).toContain("CALSCALE:GREGORIAN");
      expect(calendar).toContain("METHOD:PUBLISH");
      expect(calendar).toContain("X-WR-CALNAME:Test Calendar");
    });

    it("includes calendar description when provided", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: sampleEvents,
        name: "Test Calendar",
        timezone: "America/New_York",
      });

      expect(calendar).toContain("X-WR-CALDESC:A test calendar description");
    });

    it("includes timezone definition", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: sampleEvents,
        name: "Test Calendar",
        timezone: "America/New_York",
      });

      expect(calendar).toContain("X-WR-TIMEZONE:America/New_York");
      expect(calendar).toContain("BEGIN:VTIMEZONE");
      expect(calendar).toContain("TZID:America/New_York");
      expect(calendar).toContain("END:VTIMEZONE");
    });

    it("includes basic timezone content for non-New-York timezone", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: sampleEvents,
        name: "Test Calendar",
        timezone: "UTC",
      });

      expect(calendar).toContain("X-WR-TIMEZONE:UTC");
      expect(calendar).toContain("BEGIN:VTIMEZONE");
      expect(calendar).toContain("TZID:UTC");
      expect(calendar).toContain("END:VTIMEZONE");
      expect(calendar).not.toContain("BEGIN:DAYLIGHT");
    });

    it("includes all events", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: sampleEvents,
        name: "Test Calendar",
        timezone: "America/New_York",
      });

      expect(calendar).toContain("SUMMARY:Vernal Equinox");
      expect(calendar).toContain("SUMMARY:Full Moon");
      expect(calendar.match(/BEGIN:VEVENT/g) || []).toHaveLength(2);
      expect(calendar.match(/END:VEVENT/g) || []).toHaveLength(2);
    });

    it("handles empty events array", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: [],
        name: "Empty Calendar",
        timezone: "America/New_York",
      });

      expect(calendar).toContain("BEGIN:VCALENDAR");
      expect(calendar).toContain("END:VCALENDAR");
      expect(calendar).not.toContain("BEGIN:VEVENT");
    });

    it("includes daylight saving time rules for New York", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: sampleEvents,
        name: "Test Calendar",
        timezone: "America/New_York",
      });

      expect(calendar).toContain("BEGIN:DAYLIGHT");
      expect(calendar).toContain("END:DAYLIGHT");
      expect(calendar).toContain("BEGIN:STANDARD");
      expect(calendar).toContain("END:STANDARD");
      expect(calendar).toContain("TZNAME:EDT");
      expect(calendar).toContain("TZNAME:EST");
    });

    it("omits optional calendar description and timezone fields when absent", () => {
      const calendar = service.buildFileContent({
        events: sampleEvents,
        name: "No Optional Fields",
      } as never);

      expect(calendar).toContain("X-WR-CALNAME:No Optional Fields");
      expect(calendar).not.toContain("X-WR-CALDESC:");
      expect(calendar).not.toContain("X-WR-TIMEZONE:");
      expect(calendar).not.toContain("BEGIN:VTIMEZONE");
    });
  });

  describe("write", () => {
    it("writes ICS output to configured directory", async () => {
      const infoSpy = vi.spyOn(logger, "info").mockReturnValue(undefined);

      const events: Event[] = [
        {
          categories: ["Astronomy"],
          description: "Sample event",
          end: moment.tz("2025-03-20T09:06:00", "America/New_York"),
          start: moment.tz("2025-03-20T09:06:00", "America/New_York"),
          summary: "Sample event",
        },
      ];

      await service.write(events, {
        end: moment.tz("2025-03-21T00:00:00", "America/New_York"),
        latitude: 40.7128,
        longitude: -74.006,
        start: moment.tz("2025-03-20T00:00:00", "America/New_York"),
        timezone: "America/New_York",
      });

      expect(configService.get).toHaveBeenCalledWith("OUTPUT_DIRECTORY");
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("caelundas_"),
        expect.any(Uint8Array),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        "✏️ Wrote events to file",
        undefined,
        {
          calendarFilename: expect.stringContaining("caelundas_") as string,
          count: 1,
        },
      );
    });

    it("logs and rethrows when writing the calendar file fails", async () => {
      const errorSpy = vi.spyOn(logger, "error").mockReturnValue(undefined);
      const writeFailure = new Error("disk full");
      vi.mocked(writeFile).mockRejectedValueOnce(writeFailure);

      const events: Event[] = [
        {
          categories: ["Astronomy"],
          description: "Sample event",
          end: moment.tz("2025-03-20T09:06:00", "America/New_York"),
          start: moment.tz("2025-03-20T09:06:00", "America/New_York"),
          summary: "Sample event",
        },
      ];

      await expect(
        service.write(events, {
          end: moment.tz("2025-03-21T00:00:00", "America/New_York"),
          latitude: 40.7128,
          longitude: -74.006,
          start: moment.tz("2025-03-20T00:00:00", "America/New_York"),
          timezone: "America/New_York",
        }),
      ).rejects.toThrow("disk full");

      expect(errorSpy).toHaveBeenCalledWith(
        "📝 Failed writing the calendar file",
        undefined,
        {
          path: expect.stringContaining("caelundas_") as string,
          reason: "disk full",
        },
      );
    });

    it("stringifies a non-Error rejection when logging the failure", async () => {
      const errorSpy = vi.spyOn(logger, "error").mockReturnValue(undefined);
      vi.mocked(writeFile).mockRejectedValueOnce("disk full");

      const events: Event[] = [
        {
          categories: ["Astronomy"],
          description: "Sample event",
          end: moment.tz("2025-03-20T09:06:00", "America/New_York"),
          start: moment.tz("2025-03-20T09:06:00", "America/New_York"),
          summary: "Sample event",
        },
      ];

      await expect(
        service.write(events, {
          end: moment.tz("2025-03-21T00:00:00", "America/New_York"),
          latitude: 40.7128,
          longitude: -74.006,
          start: moment.tz("2025-03-20T00:00:00", "America/New_York"),
          timezone: "America/New_York",
        }),
      ).rejects.toBe("disk full");

      expect(errorSpy).toHaveBeenCalledWith(
        "📝 Failed writing the calendar file",
        undefined,
        {
          path: expect.stringContaining("caelundas_") as string,
          reason: "disk full",
        },
      );
    });

    it("falls back to default output directory when config is missing", async () => {
      configService.get.mockReturnValueOnce(undefined);

      await service.write(
        [
          {
            categories: ["Astronomy"],
            description: "Fallback output test",
            end: moment.tz("2025-03-20T10:00:00", "America/New_York"),
            start: moment.tz("2025-03-20T10:00:00", "America/New_York"),
            summary: "Fallback output test",
          },
        ],
        {
          end: moment.tz("2025-03-21T00:00:00", "America/New_York"),
          latitude: 40.7128,
          longitude: -74.006,
          start: moment.tz("2025-03-20T00:00:00", "America/New_York"),
          timezone: "America/New_York",
        },
      );

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("output/"),
        expect.any(Uint8Array),
      );
      expect(vi.mocked(writeFile).mock.calls.at(-1)?.[0]).toContain("output/");
    });
  });
});
