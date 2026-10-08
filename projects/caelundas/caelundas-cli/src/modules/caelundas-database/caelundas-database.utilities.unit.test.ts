import moment from "moment-timezone";
import { describe, expect, it } from "vitest";

import { createMomentTransformer } from "./caelundas-database.utilities";

describe("caelundas database utilities", () => {
  describe(createMomentTransformer, () => {
    const transformer = createMomentTransformer();

    it("writes a moment as the date it names", () => {
      const written: unknown = transformer.to(
        moment.tz("2026-07-01T06:00:00", "America/New_York"),
      );

      expect(written).toStrictEqual(new Date("2026-07-01T10:00:00Z"));
    });

    it("reads a date back as a moment in UTC", () => {
      const read: unknown = transformer.from(new Date("2026-07-01T10:00:00Z"));

      expect(moment.isMoment(read)).toBe(true);
      expect(moment.isMoment(read) && read.toISOString(true)).toBe(
        "2026-07-01T10:00:00.000+00:00",
      );
    });

    it("reads a null or an undefined back unchanged", () => {
      expect(transformer.from(null)).toBeNull();
      expect(transformer.from(undefined)).toBeUndefined();
    });

    it("passes a null, an undefined, and a date through when writing", () => {
      const date = new Date("2026-07-01T10:00:00Z");

      expect(transformer.to(null)).toBeNull();
      expect(transformer.to(undefined)).toBeUndefined();
      expect(transformer.to(date)).toBe(date);
    });
  });
});
