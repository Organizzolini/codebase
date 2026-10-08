import { mkdir, writeFile } from "node:fs/promises";

import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logging";

import { mockDates } from "../../../testing/mocks";

import { CalendarService } from "./calendar.service";

import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn<typeof mkdir>(),
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
    const baseEvent: DetectedCalendarEvent = {
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
      const eventWithLocation: DetectedCalendarEvent = {
        ...baseEvent,
        location: "Philadelphia, PA",
      };
      const vevent = service.buildEventContent(eventWithLocation);

      expect(vevent).toContain("LOCATION:Philadelphia, PA");
    });

    it("includes color when provided", () => {
      const eventWithColor: DetectedCalendarEvent = {
        ...baseEvent,
        color: "red",
      };
      const vevent = service.buildEventContent(eventWithColor);

      expect(vevent).toContain("COLOR:red");
    });

    it("leaves out a stored null location and color", () => {
      const storedEvent: DetectedCalendarEvent = {
        ...baseEvent,
        color: null,
        location: null,
      };
      const vevent = service.buildEventContent(storedEvent);

      expect(vevent).not.toContain("LOCATION:");
      expect(vevent).not.toContain("COLOR:");
    });

    it("generates unique UID based on event details", () => {
      const vevent = service.buildEventContent(baseEvent);
      const uid = /UID:(.+)/.exec(vevent)?.[1] ?? "";

      expect(uid).toContain(baseEvent.summary);
      expect(uid).toContain(baseEvent.description);
    });

    it("handles events with different start and end times", () => {
      const durationEvent: DetectedCalendarEvent = {
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
    const sampleEvents: DetectedCalendarEvent[] = [
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

    it("includes a standard observance for UTC", () => {
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
      expect(calendar).toContain("BEGIN:STANDARD");
      expect(calendar).not.toContain("BEGIN:DAYLIGHT");
    });

    it.each([
      "Australia/Sydney",
      "Europe/Oslo",
      "Atlantic/Reykjavik",
      "Europe/Madrid",
      "Pacific/Fiji",
      "America/New_York",
      "UTC",
    ])("emits a valid VTIMEZONE with observances for %s", (timezone) => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: sampleEvents,
        name: "Test Calendar",
        timezone,
      });
      const block = /BEGIN:VTIMEZONE[\s\S]*END:VTIMEZONE/.exec(calendar)?.[0];

      expect(block).toContain(`TZID:${timezone}`);

      const components = block?.match(/BEGIN:(STANDARD|DAYLIGHT)/g) ?? [];

      expect(components.length).toBeGreaterThan(0);

      for (const component of block
        ?.split(/(?=BEGIN:(?:STANDARD|DAYLIGHT))/)
        .slice(1) ?? []) {
        expect(component).toMatch(/TZOFFSETFROM:[+-]\d{4}/);
        expect(component).toMatch(/TZOFFSETTO:[+-]\d{4}/);
        expect(component).toMatch(/DTSTART:\d{8}T\d{6}\n/);
      }
    });

    it("describes Sydney daylight saving as +1100 daylight", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: [
          {
            categories: [],
            description: "d",
            end: moment.utc("2026-01-15T00:00:00Z"),
            start: moment.utc("2026-01-15T00:00:00Z"),
            summary: "s",
          },
        ],
        name: "Test Calendar",
        timezone: "Australia/Sydney",
      });

      expect(calendar).toMatch(
        /BEGIN:DAYLIGHT[\s\S]*?TZOFFSETTO:\+1100[\s\S]*?END:DAYLIGHT/,
      );
      expect(calendar).toMatch(
        /BEGIN:STANDARD[\s\S]*?TZOFFSETTO:\+1000[\s\S]*?END:STANDARD/,
      );
    });

    it("labels the opening observance DAYLIGHT when daylight time is in force", () => {
      const calendar = service.buildFileContent({
        description: "A test calendar description",
        events: [
          {
            categories: [],
            description: "d",
            end: moment.utc("2026-01-15T00:00:00Z"),
            start: moment.utc("2026-01-15T00:00:00Z"),
            summary: "s",
          },
        ],
        name: "Test Calendar",
        timezone: "Australia/Sydney",
      });
      const opening =
        /X-LIC-LOCATION:[^\n]+\n([\s\S]*?)END:(?:STANDARD|DAYLIGHT)/.exec(
          calendar,
        )?.[1];

      expect(opening).toMatch(/^BEGIN:DAYLIGHT\n/);
      expect(opening).toContain("TZOFFSETTO:+1100");
    });

    it("keeps the instant of an event in the repeated fall-back hour", () => {
      const secondPass = moment.utc("2026-11-01T06:30:00Z"); // 01:30 EST
      const firstPass = moment.utc("2026-11-01T05:30:00Z"); // 01:30 EDT
      for (const instant of [firstPass, secondPass]) {
        const vevent = service.buildEventContent({
          categories: [],
          description: "d",
          end: instant,
          start: instant,
          summary: "s",
        });
        const value = /DTSTART(?:;TZID=[^:]+)?:(\d{8}T\d{6}Z?)/.exec(
          vevent,
        )?.[1];

        expect(value).toBe(`${instant.format("YYYYMMDDTHHmmss")}Z`);
      }
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

    describe("content lines (RFC 5545 §3.1)", () => {
      const longDescription = `🌕 ${"Full Moon in Libra opposite the Sun in Aries, ".repeat(4)}✨`;
      const calendar = (): string =>
        service.buildFileContent({
          description: "A test calendar description",
          events: [
            {
              categories: ["Astronomy", "Lunar Phase"],
              description: longDescription,
              end: moment.utc("2025-03-29T10:58:00Z"),
              start: moment.utc("2025-03-29T10:58:00Z"),
              summary: "Full Moon",
            },
          ],
          name: "Test Calendar",
          timezone: "America/New_York",
        });

      it("ends every line with CRLF", () => {
        const content = calendar();

        expect(content).not.toMatch(/(?<!\r)\n/);
        expect(content.endsWith("END:VCALENDAR\r\n")).toBe(true);
      });

      it("folds every line to at most 75 octets", () => {
        const lines = calendar().split("\r\n");

        for (const line of lines) {
          expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
        }
      });

      it("unfolds a folded line back to its original value", () => {
        const unfolded = calendar().replaceAll(/\r\n[ \t]/g, "");

        expect(unfolded).toContain(`DESCRIPTION:${longDescription}\r\n`);
      });

      it("never splits a multi-octet character across a fold", () => {
        // A split surrogate pair or UTF-8 sequence would not survive the round trip.
        const lines = calendar().split("\r\n");

        for (const line of lines) {
          expect(Buffer.from(line, "utf8").toString("utf8")).toBe(line);
        }
      });
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

      const events: DetectedCalendarEvent[] = [
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
        "output/caelundas_2025-03-20_2025-03-21.ics",
        expect.any(Uint8Array),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        "✏️ Wrote events to file",
        undefined,
        {
          calendarFilename: "caelundas_2025-03-20_2025-03-21.ics",
          count: 1,
        },
      );
    });

    it("creates the output directory before writing into it", async () => {
      await service.write([], {
        end: moment.tz("2025-03-21T00:00:00", "America/New_York"),
        latitude: 40.7128,
        longitude: -74.006,
        start: moment.tz("2025-03-20T00:00:00", "America/New_York"),
        timezone: "America/New_York",
      });

      expect(mkdir).toHaveBeenCalledWith("./output", { recursive: true });
      expect(vi.mocked(mkdir).mock.invocationCallOrder.at(-1)).toBeLessThan(
        vi.mocked(writeFile).mock.invocationCallOrder.at(-1) ?? 0,
      );
    });

    it("logs and rethrows when writing the calendar file fails", async () => {
      const errorSpy = vi.spyOn(logger, "error").mockReturnValue(undefined);
      const writeFailure = new Error("disk full");
      vi.mocked(writeFile).mockRejectedValueOnce(writeFailure);

      const events: DetectedCalendarEvent[] = [
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

      const events: DetectedCalendarEvent[] = [
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

  describe("writeJson", () => {
    const input = {
      end: moment.tz("2025-03-21T00:00:00", "America/New_York"),
      latitude: 40.7128,
      longitude: -74.006,
      start: moment.tz("2025-03-20T00:00:00", "America/New_York"),
      timezone: "America/New_York",
    };
    const events: DetectedCalendarEvent[] = [
      {
        categories: ["Astronomy"],
        color: "red",
        description: "Sample event",
        end: moment.utc("2025-03-20T10:00:00Z"),
        location: "Philadelphia",
        start: moment.utc("2025-03-20T09:00:00Z"),
        summary: "Sample event",
      },
    ];

    it("writes the events as JSON beside the calendar", async () => {
      vi.spyOn(logger, "info").mockReturnValue(undefined);

      await service.writeJson(events, input);

      const [filePath, content] = vi.mocked(writeFile).mock.calls.at(-1) ?? [];

      expect(filePath).toMatch(/caelundas_.*\.json$/);
      expect(
        JSON.parse(new TextDecoder().decode(content as Uint8Array)),
      ).toStrictEqual([
        {
          categories: ["Astronomy"],
          color: "red",
          description: "Sample event",
          end: "2025-03-20T10:00:00.000Z",
          location: "Philadelphia",
          start: "2025-03-20T09:00:00.000Z",
          summary: "Sample event",
        },
      ]);
    });

    it("writes null for a missing color and location", async () => {
      vi.spyOn(logger, "info").mockReturnValue(undefined);
      const missing = events.map((event) =>
        _.omit(event, ["color", "location"]),
      );

      await service.writeJson(missing, input);

      const content = vi.mocked(writeFile).mock.calls.at(-1)?.[1];
      const [written] = JSON.parse(
        new TextDecoder().decode(content as Uint8Array),
      ) as { color: null; location: null }[];

      expect(written).toMatchObject({ color: null, location: null });
    });

    it("falls back to the default output directory", async () => {
      vi.spyOn(logger, "info").mockReturnValue(undefined);
      configService.get.mockReturnValueOnce(undefined);

      await service.writeJson(events, input);

      expect(vi.mocked(writeFile).mock.calls.at(-1)?.[0]).toContain("output/");
    });

    it.each([
      ["an error", new Error("disk full"), "disk full"],
      ["a non-error", "disk full", "disk full"],
    ])(
      "logs and rethrows when writing fails with %s",
      async (_name, failure, reason) => {
        const errorSpy = vi.spyOn(logger, "error").mockReturnValue(undefined);
        vi.mocked(writeFile).mockRejectedValueOnce(failure);

        await expect(service.writeJson(events, input)).rejects.toBe(failure);

        expect(errorSpy).toHaveBeenCalledWith(
          "📝 Failed writing the JSON file",
          undefined,
          expect.objectContaining({ reason }),
        );
      },
    );
  });
});
