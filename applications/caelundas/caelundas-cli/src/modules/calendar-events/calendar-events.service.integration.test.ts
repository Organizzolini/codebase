import moment from "moment-timezone";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { startDatabaseTestingModule } from "@codebase/database/testing";
import { LoggerModule } from "@codebase/logging";

import { environmentSchema } from "../../constants";
import { CaelundasDatabaseModule } from "../caelundas-database/caelundas-database.module";
import { CalendarEvent } from "../caelundas-database/entities/calendar-event.entity";
import { Migration1791255787877 } from "../caelundas-database/migrations/1791255787877-migration";

import { CALENDAR_EVENT_BATCH_SIZE } from "./calendar-events.constants";
import { CalendarEventsModule } from "./calendar-events.module";
import { CalendarEventsService } from "./calendar-events.service";

import type { Event } from "../calendar/calendar.types";
import type { DatabaseTestingModule } from "@codebase/database/testing";
import type { Repository } from "typeorm";

const philadelphia = { latitude: 39.949_309, longitude: -75.171_69 };
const sydney = { latitude: -33.8688, longitude: 151.2093 };

function event(summary: string, start: string, end = start): Event {
  return {
    categories: ["aspects", "moon"],
    description: `${summary} description`,
    end: moment.utc(end),
    start: moment.utc(start),
    summary,
  };
}

describe("calendar events service integration", () => {
  let database: DatabaseTestingModule;
  let service: CalendarEventsService;
  let repository: Repository<CalendarEvent>;

  beforeAll(async () => {
    // The root's unprefixed variables must never reach the connection.
    vi.stubEnv("POSTGRES_DB", "postgres");
    database = await startDatabaseTestingModule({
      database: CaelundasDatabaseModule,
      entities: [CalendarEvent],
      imports: [LoggerModule, CalendarEventsModule],
      migrations: [Migration1791255787877],
      project: "caelundas",
      validate: (config) => environmentSchema.parse(config),
    });
    service = database.module.get(CalendarEventsService);
    repository = database.repository(CalendarEvent);
  });

  afterAll(async () => {
    await database.close();
    vi.unstubAllEnvs();
  });

  it("stores events with the location they were computed for", async () => {
    expect.hasAssertions();

    await service.upsert(
      [event("Stored", "2026-01-10T00:00:00Z")],
      philadelphia,
    );
    const [row] = await repository.findBy({ summary: "Stored" });

    expect(row?.latitude).toBe("39.949309");
    expect(row?.longitude).toBe("-75.171690");
    expect(row?.categories).toStrictEqual(["aspects", "moon"]);
  });

  it("updates a repeated event in place and advances updatedAt", async () => {
    expect.hasAssertions();

    await service.upsert(
      [event("Repeated", "2026-02-10T00:00:00Z")],
      philadelphia,
    );
    const [first] = await repository.findBy({ summary: "Repeated" });
    await service.upsert(
      [
        {
          ...event("Repeated", "2026-02-10T00:00:00Z"),
          description: "changed",
        },
      ],
      philadelphia,
    );
    const rows = await repository.findBy({ summary: "Repeated" });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.description).toBe("changed");
    expect(rows[0]?.id).toBe(first?.id);
    expect(rows[0]?.createdAt.getTime()).toBe(first?.createdAt.getTime());
    expect(rows[0]?.updatedAt.getTime()).toBeGreaterThan(
      first?.updatedAt.getTime() ?? Number.POSITIVE_INFINITY,
    );
  });

  it("adds separate rows for a second location", async () => {
    expect.hasAssertions();

    const sunrise = event("Sunrise", "2026-03-10T10:00:00Z");
    await service.upsert([sunrise], philadelphia);
    await service.upsert([sunrise], sydney);

    await expect(repository.countBy({ summary: "Sunrise" })).resolves.toBe(2);
  });

  it("keeps one row when a batch repeats an event", async () => {
    expect.hasAssertions();

    const twice = event("Twice", "2026-04-10T00:00:00Z");
    await service.upsert([twice, twice], philadelphia);

    await expect(repository.countBy({ summary: "Twice" })).resolves.toBe(1);
  });

  /**
   * Thirty seconds rather than the shared five: two full batches of inserts
   * took just over five seconds on a CI runner, which is several times
   * slower than a local machine.
   */
  const BULK_UPSERT_TIMEOUT_MILLISECONDS = 30_000;

  it(
    "writes more events than one statement's parameters allow",
    async () => {
      expect.hasAssertions();

      const count = CALENDAR_EVENT_BATCH_SIZE + 10;
      const start = moment.utc("2030-01-01T00:00:00Z");
      await service.upsert(
        Array.from({ length: count }, (_value, index) => {
          const at = start.clone().add(index, "minutes").toISOString();
          return event(`Bulk ${String(index)}`, at);
        }),
        philadelphia,
      );

      await expect(
        repository
          .createQueryBuilder("event")
          .where("event.summary LIKE 'Bulk %'")
          .getCount(),
      ).resolves.toBe(count);
    },
    BULK_UPSERT_TIMEOUT_MILLISECONDS,
  );

  describe("findInRange", () => {
    const range = {
      ...philadelphia,
      end: moment.utc("2027-01-31T00:00:00Z"),
      start: moment.utc("2027-01-01T00:00:00Z"),
    };

    beforeAll(async () => {
      await service.upsert(
        [
          event("Inside", "2027-01-10T00:00:00Z"),
          event("Instant at start", "2027-01-01T00:00:00Z"),
          event("Before", "2026-12-01T00:00:00Z", "2026-12-02T00:00:00Z"),
          event("After", "2027-02-10T00:00:00Z"),
          event("Spans start", "2026-12-20T00:00:00Z", "2027-01-05T00:00:00Z"),
          event("Spans end", "2027-01-25T00:00:00Z", "2027-02-05T00:00:00Z"),
          event(
            "Ends at start",
            "2026-12-30T00:00:00Z",
            "2027-01-01T00:00:00Z",
          ),
        ],
        philadelphia,
      );
      await service.upsert(
        [event("Elsewhere", "2027-01-10T00:00:00Z")],
        sydney,
      );
    });

    it("includes events that overlap the range, ordered by start", async () => {
      expect.hasAssertions();

      const rows = await service.findInRange(range);

      expect(rows.map((row) => row.summary)).toStrictEqual([
        "Spans start",
        "Instant at start",
        "Inside",
        "Spans end",
      ]);
    });

    it("returns only the requested location", async () => {
      expect.hasAssertions();

      const rows = await service.findInRange({ ...range, ...sydney });

      expect(rows.map((row) => row.summary)).toStrictEqual(["Elsewhere"]);
    });
  });
});
