import moment from "moment-timezone";
import { describe, expect, it } from "vitest";

import { formatCoordinate, toEvent } from "./calendar-events.utilities";

import type { CalendarEvent } from "../caelundas-database/entities/calendar-event.entity";

describe("calendar events utilities", () => {
  describe(formatCoordinate, () => {
    it("rounds to the six decimals the column stores", () => {
      expect(formatCoordinate(39.949_309_4)).toBe("39.949309");
    });

    it("pads a short coordinate to six decimals", () => {
      expect(formatCoordinate(-75.5)).toBe("-75.500000");
    });
  });

  describe(toEvent, () => {
    const buildRow = (
      color: null | string,
      location: null | string,
    ): CalendarEvent =>
      ({
        categories: ["aspects"],
        color,
        description: "Exact",
        end: new Date("2026-07-01T12:00:00Z"),
        location,
        start: new Date("2026-07-01T10:00:00Z"),
        summary: "Aspect",
      }) as CalendarEvent;
    const row = buildRow(null, null);

    it("rebuilds the calendar event in UTC", () => {
      const event = toEvent(row);

      expect(event.start.isSame(moment.utc("2026-07-01T10:00:00Z"))).toBe(true);
      expect(event.end.isSame(moment.utc("2026-07-01T12:00:00Z"))).toBe(true);
      expect(event.summary).toBe("Aspect");
    });

    it("leaves a null color and location out", () => {
      const event = toEvent(row);

      expect(event.color).toBeUndefined();
      expect(event.location).toBeUndefined();
    });

    it("keeps a stored color and location", () => {
      const event = toEvent(buildRow("red", "Philadelphia"));

      expect(event.color).toBe("red");
      expect(event.location).toBe("Philadelphia");
    });
  });
});
