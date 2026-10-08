import fs from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import _ from "lodash";
import moment from "moment-timezone";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { startDatabaseTestingModule } from "@codebase/database/testing";
import { LoggerService } from "@codebase/logging";

import {
  detectable,
  runCalendarCommand,
} from "../testing/calendar-command.utilities";
import { createMajorAspectsService } from "../testing/major-aspects.utilities";

import { environmentSchema } from "./constants";
import { CaelundasDatabaseModule } from "./modules/caelundas-database/caelundas-database.module";
import { CalendarEvent } from "./modules/caelundas-database/entities/calendar-event.entity";
import { Migration1791255787877 } from "./modules/caelundas-database/migrations/1791255787877-migration";
import { CalendarService } from "./modules/calendar/calendar.service";
import { IngressesService } from "./modules/ingresses/ingresses.service";
import { inputSchema } from "./modules/input/input.constants";
import { MathService } from "./modules/math/math.service";
import { ProgressiveUtilitiesService } from "./modules/progressive/progressive-utilities.service";

import type { CalendarCommandOutput } from "../testing/calendar-command.types";
import type { EphemerisService } from "./modules/ephemeris/ephemeris.service";
import type { Environment } from "./modules/input/input.types";
import type { DatabaseTestingModule } from "@codebase/database/testing";
import type { ConfigService } from "@nestjs/config";
import type { Repository } from "typeorm";

const TEST_OUTPUT_DIR = "./output/e2e-test";

const calendarService = new CalendarService(new LoggerService(), {
  get: () => TEST_OUTPUT_DIR,
} as unknown as ConfigService<Environment>);

describe("main end-to-end suite", () => {
  it("defaults the postgres connection and output directory", () => {
    expect.hasAssertions();
    expect(environmentSchema.parse({})).toStrictEqual({
      CAELUNDAS_POSTGRES_DATABASE: "caelundas_development",
      CAELUNDAS_POSTGRES_HOST: "localhost",
      CAELUNDAS_POSTGRES_PASSWORD: "caelundas_password",
      CAELUNDAS_POSTGRES_PORT: 5432,
      CAELUNDAS_POSTGRES_SCHEMA: "caelundas",
      CAELUNDAS_POSTGRES_USERNAME: "caelundas_username",
      OUTPUT_DIRECTORY: "./output",
    });
  });

  describe("calendar generation e2e", { timeout: 10_000 }, () => {
    beforeAll(() => {
      fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    });

    afterAll(() => {
      fs.rmSync(TEST_OUTPUT_DIR, { force: true, recursive: true });
    });

    describe("iCS file generation", () => {
      it("generates valid ICS file structure", () => {
        const events = [
          detectable("☀️ → ♈ Sun ingress Aries", "2025-03-20T09:06:00Z"),
          detectable("🌕 Full Moon", "2025-03-29T10:58:00Z"),
        ];

        const calendar = calendarService.buildFileContent({
          description: "E2E test calendar",
          events,
          name: "Test Caelundas Calendar",
          timezone: "America/New_York",
        });

        // Write to test file
        const outputPath = path.join(TEST_OUTPUT_DIR, "test-calendar.ics");
        fs.writeFileSync(outputPath, calendar);

        // Verify file was created
        expect(fs.existsSync(outputPath)).toBe(true);

        // Read and validate content
        const content = fs.readFileSync(outputPath, "utf8");

        // Check required ICS components
        expect(content).toContain("BEGIN:VCALENDAR");
        expect(content).toContain("END:VCALENDAR");
        expect(content).toContain("VERSION:2.0");
        expect(content).toContain(
          "PRODID:-//Caelundas//Astronomical Calendar//EN",
        );
        expect(content).toContain("CALSCALE:GREGORIAN");
        expect(content).toContain("METHOD:PUBLISH");

        // Check calendar metadata
        expect(content).toContain("X-WR-CALNAME:Test Caelundas Calendar");
        expect(content).toContain("X-WR-CALDESC:E2E test calendar");
        expect(content).toContain("X-WR-TIMEZONE:America/New_York");

        // Check events
        expect(content).toContain("BEGIN:VEVENT");
        expect(content).toContain("END:VEVENT");
        expect(content).toContain("Sun ingress Aries");
        expect(content).toContain("Full Moon");

        // Verify event count
        const veventCount = (content.match(/BEGIN:VEVENT/g) ?? []).length;

        expect(veventCount).toBe(2);
      });

      it("includes timezone definitions", () => {
        const events = [detectable("Summer Solstice", "2025-06-21T12:00:00Z")];

        const calendar = calendarService.buildFileContent({
          description: "E2E timezone test calendar",
          events,
          name: "Timezone Test",
          timezone: "America/New_York",
        });

        expect(calendar).toContain("BEGIN:VTIMEZONE");
        expect(calendar).toContain("TZID:America/New_York");
        expect(calendar).toContain("END:VTIMEZONE");
        expect(calendar).toContain("BEGIN:DAYLIGHT");
        expect(calendar).toContain("END:DAYLIGHT");
        expect(calendar).toContain("BEGIN:STANDARD");
        expect(calendar).toContain("END:STANDARD");
      });

      it("handles events with all optional fields", () => {
        const events = [
          {
            categories: ["Astronomy", "Eclipse", "Solar"],
            color: "red",
            description: "Total Solar Eclipse visible from North America",
            end: moment.utc("2025-04-08T20:00:00Z"),
            location: "Dallas, Texas, USA",
            start: moment.utc("2025-04-08T18:00:00Z"),
            summary: "Total Solar Eclipse",
          },
        ];

        const calendar = calendarService.buildFileContent({
          description: "E2E optional fields test calendar",
          events,
          name: "Eclipse Calendar",
          timezone: "America/New_York",
        });

        expect(calendar).toContain("LOCATION:Dallas, Texas, USA");
        expect(calendar).toContain("COLOR:red");
      });
    });

    describe("input validation e2e", () => {
      it("validates and transform coordinates correctly", () => {
        const result = inputSchema.parse({
          endDate: "2025-03-31",
          latitude: "40.7128",
          longitude: "-74.006",
          startDate: "2025-03-01",
        });

        expect(result.latitude).toBe(40.7128);
        expect(result.longitude).toBe(-74.006);
        expect(result.timezone).toBe("America/New_York");
        expect(moment.isMoment(result.start)).toBe(true);
        expect(moment.isMoment(result.end)).toBe(true);
      });

      it("infers correct timezone for different locations", () => {
        // Tokyo
        const tokyoResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "35.6762",
          longitude: "139.6503",
          startDate: "2025-01-01",
        });

        expect(tokyoResult.timezone).toBe("Asia/Tokyo");

        // London
        const londonResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "51.5074",
          longitude: "-0.1278",
          startDate: "2025-01-01",
        });

        expect(londonResult.timezone).toBe("Europe/London");

        // Sydney
        const sydneyResult = inputSchema.parse({
          endDate: "2025-01-02",
          latitude: "-33.8688",
          longitude: "151.2093",
          startDate: "2025-01-01",
        });

        expect(sydneyResult.timezone).toBe("Australia/Sydney");
      });
    });

    describe("event detection e2e", () => {
      it("correctly identify zodiac signs from longitude", () => {
        // Test all 12 signs at their starting degrees
        expect(IngressesService.getSign(0)).toBe("aries");
        expect(IngressesService.getSign(30)).toBe("taurus");
        expect(IngressesService.getSign(60)).toBe("gemini");
        expect(IngressesService.getSign(90)).toBe("cancer");
        expect(IngressesService.getSign(120)).toBe("leo");
        expect(IngressesService.getSign(150)).toBe("virgo");
        expect(IngressesService.getSign(180)).toBe("libra");
        expect(IngressesService.getSign(210)).toBe("scorpio");
        expect(IngressesService.getSign(240)).toBe("sagittarius");
        expect(IngressesService.getSign(270)).toBe("capricorn");
        expect(IngressesService.getSign(300)).toBe("aquarius");
        expect(IngressesService.getSign(330)).toBe("pisces");
      });

      it("correctly identify aspects from angular separation", () => {
        const service =
          createMajorAspectsService(createMock<EphemerisService>());

        // Test exact aspects
        expect(
          service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 0 }),
        ).toBe("conjunct");
        expect(
          service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 60 }),
        ).toBe("sextile");
        expect(
          service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 90 }),
        ).toBe("square");
        expect(
          service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 120 }),
        ).toBe("trine");
        expect(
          service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 180 }),
        ).toBe("opposite");

        // Test aspects with orb
        expect(
          service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 5 }),
        ).toBe("conjunct"); // 5° orb
        expect(
          service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 175 }),
        ).toBe("opposite"); // 5° orb
      });

      it("calculates progressive event pairs correctly", () => {
        const beginnings = [
          detectable("Forming 1", "2025-03-01T10:00:00Z"),
          detectable("Forming 2", "2025-03-05T10:00:00Z"),
        ];
        const endings = [
          detectable("Dissolving 1", "2025-03-03T10:00:00Z"),
          detectable("Dissolving 2", "2025-03-07T10:00:00Z"),
        ];

        const pairs = new ProgressiveUtilitiesService(
          new LoggerService(),
        ).pairProgressiveEvents(beginnings, endings, "test");

        expect(pairs).toHaveLength(2);
        expect(pairs[0]?.[0]?.start.toISOString()).toBe(
          "2025-03-01T10:00:00.000Z",
        );
        expect(pairs[0]?.[1]?.start.toISOString()).toBe(
          "2025-03-03T10:00:00.000Z",
        );
        expect(pairs[1]?.[0]?.start.toISOString()).toBe(
          "2025-03-05T10:00:00.000Z",
        );
        expect(pairs[1]?.[1]?.start.toISOString()).toBe(
          "2025-03-07T10:00:00.000Z",
        );
      });
    });

    describe("math utilities e2e", () => {
      it("normalizes degrees correctly across edge cases", () => {
        const mathService = new MathService();
        const normalizeDegrees = (d: number): number =>
          mathService.normalizeDegrees(d);
        const getAngle = (a: number, b: number): number =>
          mathService.getAngle(a, b);

        // Edge case: wrapping at 360
        expect(normalizeDegrees(360)).toBe(0);
        expect(normalizeDegrees(720)).toBe(0);

        // Edge case: negative degrees
        expect(normalizeDegrees(-1)).toBe(359);
        expect(normalizeDegrees(-360)).toBe(0);

        // Angle calculation across 0/360 boundary
        expect(getAngle(350, 10)).toBe(20); // Shortest path is 20°
        expect(getAngle(10, 350)).toBe(20);
      });

      it("generates correct combinations", () => {
        const mathService = new MathService();
        const getCombinations = <T>(array: T[], k: number): T[][] =>
          mathService.getCombinations(array, k);

        const planets = ["sun", "moon", "mercury", "venus", "mars"];

        // Get all pairs
        const pairs = getCombinations(planets, 2);

        expect(pairs).toHaveLength(10); // C(5,2) = 10

        // Get all triplets
        const triplets = getCombinations(planets, 3);

        expect(triplets).toHaveLength(10); // C(5,3) = 10

        // Verify no duplicates in pairs
        const pairStrings = pairs.map((p) => _.sortBy(p).join("-"));
        const uniquePairs = new Set(pairStrings);

        expect(uniquePairs.size).toBe(10);
      });
    });
  });

  describe("stored calendar events", { timeout: 120_000 }, () => {
    const output = "./output/e2e-postgres";
    const philadelphia = { latitude: 39.949_309, longitude: -75.171_69 };
    const sydney = { latitude: -33.8688, longitude: 151.2093 };
    const marchFirstHalf = { endDate: "2026-03-16", startDate: "2026-03-01" };
    const marchSecondHalf = { endDate: "2026-03-31", startDate: "2026-03-10" };
    const sky = [
      detectable("Early", "2026-03-02T12:00:00Z"),
      detectable("Overlap", "2026-03-12T12:00:00Z"),
      detectable("Late", "2026-03-20T12:00:00Z"),
    ];
    let database: DatabaseTestingModule;
    let calendarEvents: Repository<CalendarEvent>;
    let runs = 0;

    const run = async (
      place: { latitude: number; longitude: number },
      range: { endDate: string; startDate: string },
      detected = sky,
    ): Promise<CalendarCommandOutput> =>
      runCalendarCommand(
        {
          ...place,
          ...range,
          outputDirectory: path.join(output, String(runs++)),
        },
        detected,
      );
    const summaries = (rows: CalendarEvent[]): string[] =>
      rows.map((row) => row.summary).toSorted();

    beforeAll(async () => {
      database = await startDatabaseTestingModule({
        database: CaelundasDatabaseModule,
        entities: [CalendarEvent],
        migrations: [Migration1791255787877],
        project: "caelundas",
        validate: (config) => environmentSchema.parse(config),
      });
      calendarEvents = database.repository(CalendarEvent);
    }, 120_000);

    afterAll(async () => {
      await database.close();
      vi.unstubAllEnvs();
      fs.rmSync(output, { force: true, recursive: true });
    });

    it("writes event rows and renders the files from them", async () => {
      expect.hasAssertions();

      // A row no detector reports can only reach the files through the table.
      await calendarEvents.insert({
        categories: ["e2e"],
        description: "stored directly",
        end: moment.utc("2026-03-05T00:00:00Z"),
        latitude: "39.949309",
        longitude: "-75.171690",
        start: moment.utc("2026-03-05T00:00:00Z"),
        summary: "Planted",
      });
      const { ics, json } = await run(philadelphia, marchFirstHalf);

      expect(summaries(await calendarEvents.find())).toStrictEqual([
        "Early",
        "Overlap",
        "Planted",
      ]);
      expect(json.map((event) => event.summary)).toStrictEqual([
        "Early",
        "Planted",
        "Overlap",
      ]);
      expect(ics).toContain("SUMMARY:Planted");
      expect(ics).toContain("SUMMARY:Overlap");
    });

    it("is idempotent when a range repeats", async () => {
      expect.hasAssertions();

      const before = await calendarEvents.find({ order: { summary: "ASC" } });
      await run(philadelphia, marchFirstHalf);
      const after = await calendarEvents.find({ order: { summary: "ASC" } });

      expect(after.map((row) => row.id)).toStrictEqual(
        before.map((row) => row.id),
      );
    });

    it("updates an overlapping range in place and adds only new events", async () => {
      expect.hasAssertions();

      const [before] = await calendarEvents.findBy({ summary: "Overlap" });
      const { json } = await run(philadelphia, marchSecondHalf);
      const overlap = await calendarEvents.findBy({ summary: "Overlap" });

      expect(overlap).toHaveLength(1);
      expect(overlap[0]?.id).toBe(before?.id);
      expect(overlap[0]?.createdAt).toStrictEqual(before?.createdAt);
      expect(overlap[0]?.updatedAt.getTime()).toBeGreaterThan(
        before?.updatedAt.getTime() ?? Number.POSITIVE_INFINITY,
      );
      await expect(calendarEvents.countBy({ summary: "Late" })).resolves.toBe(
        1,
      );
      expect(json.map((event) => event.summary)).toStrictEqual([
        "Overlap",
        "Late",
      ]);
    });

    it("adds separate rows for a second location", async () => {
      expect.hasAssertions();

      const total = await calendarEvents.count();
      const { json } = await run(sydney, marchFirstHalf);

      await expect(calendarEvents.count()).resolves.toBe(total + 2);
      expect(json.map((event) => event.summary)).toStrictEqual([
        "Early",
        "Overlap",
      ]);
    });

    it("includes an event spanning the edge of the range", async () => {
      expect.hasAssertions();

      const retrograde = detectable(
        "Retrograde",
        "2026-04-20T00:00:00Z",
        "2026-05-10T00:00:00Z",
      );
      await run(
        philadelphia,
        { endDate: "2026-05-01", startDate: "2026-04-01" },
        [retrograde],
      );
      // May's detector reports nothing, because the event started in April.
      const { ics, json } = await run(
        philadelphia,
        { endDate: "2026-06-01", startDate: "2026-05-01" },
        [],
      );

      expect(json.map((event) => event.summary)).toStrictEqual(["Retrograde"]);
      expect(ics).toContain("SUMMARY:Retrograde");
    });

    it("includes events on the last requested day in both files", async () => {
      expect.hasAssertions();

      const { ics, json } = await run(
        philadelphia,
        { endDate: "2026-06-10", startDate: "2026-06-01" },
        [detectable("Last day", "2026-06-10T12:00:00Z")],
      );

      expect(json.map((event) => event.summary)).toStrictEqual(["Last day"]);
      expect(ics).toContain("SUMMARY:Last day");
    });
  });
});
