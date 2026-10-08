import { describe, expect, it } from "vitest";

import { formatCoordinate } from "./calendar-events.utilities";

describe("calendar events utilities", () => {
  describe(formatCoordinate, () => {
    it("rounds to the six decimals the column stores", () => {
      expect(formatCoordinate(39.949_309_4)).toBe("39.949309");
    });

    it("pads a short coordinate to six decimals", () => {
      expect(formatCoordinate(-75.5)).toBe("-75.500000");
    });
  });
});
