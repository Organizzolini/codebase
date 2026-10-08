import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import moment from "moment-timezone";
import { afterAll, describe, expect, it } from "vitest";

import {
  assertReferenceEvents,
  compareReferenceEvents,
  loadReferenceFixture,
} from "./reference-fixtures.utilities";

import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type { ReferenceFixture } from "./reference-fixtures.types";

function detected(
  summary: string,
  start: string,
  end = start,
): DetectedCalendarEvent {
  return {
    categories: [],
    description: "",
    end: moment.utc(end),
    start: moment.utc(start),
    summary,
  };
}

const fixture: ReferenceFixture = {
  events: [{ start: "2026-03-20T10:37:00Z", summary: "🌄 Civil Dawn" }],
  name: "a sample fixture",
  retrieved: "2026-10-07",
  source: { name: "Sample Authority", url: "https://example.test/almanac" },
  toleranceMinutes: 2,
  window: {
    endDate: "2026-03-21",
    latitude: 39.949_309,
    longitude: -75.171_69,
    startDate: "2026-03-20",
  },
};

describe("reference fixtures", () => {
  describe(compareReferenceEvents, () => {
    it("passes an event inside the tolerance and reports its delta", () => {
      expect.hasAssertions();

      const [comparison] = compareReferenceEvents(
        [detected("🌄 Civil Dawn", "2026-03-20T10:38:30Z")],
        fixture,
      );

      expect(comparison?.passed).toBe(true);
      expect(comparison?.startDeltaMinutes).toBeCloseTo(1.5);
    });

    it("passes an event exactly on the tolerance", () => {
      expect.hasAssertions();

      const [comparison] = compareReferenceEvents(
        [detected("🌄 Civil Dawn", "2026-03-20T10:35:00Z")],
        fixture,
      );

      expect(comparison?.passed).toBe(true);
      expect(comparison?.startDeltaMinutes).toBeCloseTo(-2);
    });

    it("fails an event outside the tolerance", () => {
      expect.hasAssertions();

      const [comparison] = compareReferenceEvents(
        [detected("🌄 Civil Dawn", "2026-03-20T10:40:00Z")],
        fixture,
      );

      expect(comparison?.passed).toBe(false);
    });

    it("compares against the nearest event that shares the summary", () => {
      expect.hasAssertions();

      const [comparison] = compareReferenceEvents(
        [
          detected("🌄 Civil Dawn", "2026-03-21T10:36:00Z"),
          detected("🌅 Nautical Dawn", "2026-03-20T10:37:00Z"),
          detected("🌄 Civil Dawn", "2026-03-20T10:38:00Z"),
        ],
        fixture,
      );

      expect(comparison?.actual?.start.toISOString()).toBe(
        "2026-03-20T10:38:00.000Z",
      );
    });

    it("fails an event no detected event matches", () => {
      expect.hasAssertions();

      const [comparison] = compareReferenceEvents(
        [detected("🌅 Nautical Dawn", "2026-03-20T10:37:00Z")],
        fixture,
      );

      expect(comparison?.passed).toBe(false);
      expect(comparison?.actual).toBeUndefined();
    });

    it("lets an event override the fixture tolerance", () => {
      expect.hasAssertions();

      const [comparison] = compareReferenceEvents(
        [detected("🌄 Civil Dawn", "2026-03-20T10:47:00Z")],
        {
          ...fixture,
          events: [
            {
              start: "2026-03-20T10:37:00Z",
              summary: "🌄 Civil Dawn",
              toleranceMinutes: 15,
            },
          ],
        },
      );

      expect(comparison?.passed).toBe(true);
    });

    it("also holds a span's end to the tolerance", () => {
      expect.hasAssertions();

      const spanFixture: ReferenceFixture = {
        ...fixture,
        events: [
          {
            end: "2026-03-20T23:40:00Z",
            start: "2026-03-20T10:37:00Z",
            summary: "☀️ Daylight",
          },
        ],
      };
      const [onTime, lateEnd] = [
        detected("☀️ Daylight", "2026-03-20T10:37:00Z", "2026-03-20T23:41:00Z"),
        detected("☀️ Daylight", "2026-03-20T10:37:00Z", "2026-03-20T23:50:00Z"),
      ].map((event) => compareReferenceEvents([event], spanFixture)[0]);

      expect(onTime?.passed).toBe(true);
      expect(onTime?.endDeltaMinutes).toBeCloseTo(1);
      expect(lateEnd?.passed).toBe(false);
      expect(lateEnd?.endDeltaMinutes).toBeCloseTo(10);
    });
  });

  describe(assertReferenceEvents, () => {
    it("passes when every event is inside the tolerance", () => {
      expect.hasAssertions();
      expect(() => {
        assertReferenceEvents(
          [detected("🌄 Civil Dawn", "2026-03-20T10:38:00Z")],
          fixture,
        );
      }).not.toThrow();
    });

    it("names the event, expected time, actual time and delta on failure", () => {
      expect.hasAssertions();
      expect(() => {
        assertReferenceEvents(
          [detected("🌄 Civil Dawn", "2026-03-20T10:41:00Z")],
          fixture,
        );
      }).toThrow(
        /🌄 Civil Dawn: expected 2026-03-20T10:37:00\.000Z, actual 2026-03-20T10:41:00\.000Z, delta \+4\.0 min \(tolerance ±2 min\)/,
      );
    });

    it("cites the source and retrieval date", () => {
      expect.hasAssertions();
      expect(() => {
        assertReferenceEvents([], fixture);
      }).toThrow(/Sample Authority, retrieved 2026-10-07/);
    });

    it("says plainly that no event was detected", () => {
      expect.hasAssertions();
      expect(() => {
        assertReferenceEvents([], fixture);
      }).toThrow(
        /🌄 Civil Dawn: expected 2026-03-20T10:37:00\.000Z, none detected/,
      );
    });

    it("reports a span's end delta", () => {
      expect.hasAssertions();
      expect(() => {
        assertReferenceEvents(
          [
            detected(
              "☀️ Daylight",
              "2026-03-20T10:37:00Z",
              "2026-03-20T23:50:00Z",
            ),
          ],
          {
            ...fixture,
            events: [
              {
                end: "2026-03-20T23:40:00Z",
                start: "2026-03-20T10:37:00Z",
                summary: "☀️ Daylight",
              },
            ],
          },
        );
      }).toThrow(
        /end expected 2026-03-20T23:40:00\.000Z, actual 2026-03-20T23:50:00\.000Z, delta \+10\.0 min/,
      );
    });

    it("lists every failure at once", () => {
      expect.hasAssertions();
      expect(() => {
        assertReferenceEvents([], {
          ...fixture,
          events: [
            { start: "2026-03-20T10:37:00Z", summary: "🌄 Civil Dawn" },
            { start: "2026-03-20T23:40:00Z", summary: "🌇 Civil Dusk" },
          ],
        });
      }).toThrow(/Civil Dawn[\s\S]*Civil Dusk/);
    });

    it("fails when an event that must be absent is detected", () => {
      expect.hasAssertions();
      expect(() => {
        assertReferenceEvents(
          [
            detected("🌄 Civil Dawn", "2026-03-20T10:37:00Z"),
            detected("🌑 Solar Eclipse", "2026-03-20T12:00:00Z"),
          ],
          { ...fixture, absent: ["🌑 Solar Eclipse"] },
        );
      }).toThrow(
        /🌑 Solar Eclipse: must not be detected, found at 2026-03-20T12:00:00\.000Z/,
      );
    });
  });

  describe(loadReferenceFixture, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "reference-"));

    afterAll(() => {
      fs.rmSync(directory, { force: true, recursive: true });
    });

    it("reads a fixture file by name", () => {
      expect.hasAssertions();

      fs.writeFileSync(
        path.join(directory, "sample.json"),
        JSON.stringify(fixture),
      );

      expect(loadReferenceFixture("sample", directory)).toStrictEqual(fixture);
    });

    it("rejects a fixture that names no source or retrieval date", () => {
      expect.hasAssertions();

      fs.writeFileSync(
        path.join(directory, "bare.json"),
        JSON.stringify({ events: [], name: "bare" }),
      );

      expect(() => loadReferenceFixture("bare", directory)).toThrow(
        /retrieved/,
      );
    });

    it("rejects a time that is not a UTC instant", () => {
      expect.hasAssertions();

      fs.writeFileSync(
        path.join(directory, "local.json"),
        JSON.stringify({
          ...fixture,
          events: [{ start: "2026-03-20 06:37", summary: "🌄 Civil Dawn" }],
        }),
      );

      expect(() => loadReferenceFixture("local", directory)).toThrow(
        /Invalid ISO datetime/,
      );
    });
  });
});
