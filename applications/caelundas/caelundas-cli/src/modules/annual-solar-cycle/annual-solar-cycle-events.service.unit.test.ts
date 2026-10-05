import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AnnualSolarCycleEventsService } from "./annual-solar-cycle-events.service";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(AnnualSolarCycleEventsService, () => {
  let service: AnnualSolarCycleEventsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService, AnnualSolarCycleEventsService],
    }).compile();
    service = await module.resolve(AnnualSolarCycleEventsService);
  });

  describe("solar cycle event builders", () => {
    it("creates vernal equinox event with correct structure", () => {
      const timestamp = moment.utc("2024-03-20T03:06:00.000Z");

      const event = service.buildVernalEquinoxEvent(timestamp);

      expect(event.summary).toBe("🌸 Vernal Equinox");
      expect(event.description).toBe("Vernal Equinox");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
      expect(event.categories).toContain("Astronomy");
      expect(event.categories).toContain("Astrology");
      expect(event.categories).toContain("Annual Solar Cycle");
      expect(event.categories).toContain("Solar");
    });

    it("creates summer solstice event with correct structure", () => {
      const timestamp = moment.utc("2024-06-20T20:50:00.000Z");

      const event = service.buildSummerSolsticeEvent(timestamp);

      expect(event.summary).toBe("🌞 Summer Solstice");
      expect(event.description).toBe("Summer Solstice");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates autumnal equinox event with correct structure", () => {
      const timestamp = moment.utc("2024-09-22T12:43:00.000Z");

      const event = service.buildAutumnalEquinoxEvent(timestamp);

      expect(event.summary).toBe("🍂 Autumnal Equinox");
      expect(event.description).toBe("Autumnal Equinox");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates winter solstice event with correct structure", () => {
      const timestamp = moment.utc("2024-12-21T09:20:00.000Z");

      const event = service.buildWinterSolsticeEvent(timestamp);

      expect(event.summary).toBe("☃️ Winter Solstice");
      expect(event.description).toBe("Winter Solstice");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates Imbolc event with correct structure", () => {
      const timestamp = moment.utc("2024-02-04T12:00:00.000Z");

      const event = service.buildImbolcEvent(timestamp);

      expect(event.summary).toBe("🐑 Imbolc");
      expect(event.description).toBe("Imbolc");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates Beltane event with correct structure", () => {
      const timestamp = moment.utc("2024-05-05T12:00:00.000Z");

      const event = service.buildBeltaneEvent(timestamp);

      expect(event.summary).toBe("🐦‍🔥 Beltane");
      expect(event.description).toBe("Beltane");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates Lammas event with correct structure", () => {
      const timestamp = moment.utc("2024-08-07T12:00:00.000Z");

      const event = service.buildLammasEvent(timestamp);

      expect(event.summary).toBe("🌾 Lammas");
      expect(event.description).toBe("Lammas");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates Samhain event with correct structure", () => {
      const timestamp = moment.utc("2024-11-07T12:00:00.000Z");

      const event = service.buildSamhainEvent(timestamp);

      expect(event.summary).toBe("🎃 Samhain");
      expect(event.description).toBe("Samhain");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates first hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-03-27T12:00:00.000Z");

      const event = service.buildFirstHexadecanEvent(timestamp);

      expect(event.summary).toBe("🌳 First Hexadecan");
      expect(event.description).toBe("First Hexadecan");
      expect(event.categories).toContain("Annual Solar Cycle");
    });

    it("creates third hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-04-12T12:00:00.000Z");

      const event = service.buildThirdHexadecanEvent(timestamp);

      expect(event.summary).toBe("🌻 Third Hexadecan");
      expect(event.description).toBe("Third Hexadecan");
    });

    it("creates fifth hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-06-28T12:00:00.000Z");

      const event = service.buildFifthHexadecanEvent(timestamp);

      expect(event.summary).toBe("⛱️ Fifth Hexadecan");
      expect(event.description).toBe("Fifth Hexadecan");
    });

    it("creates seventh hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-08-14T12:00:00.000Z");

      const event = service.buildSeventhHexadecanEvent(timestamp);

      expect(event.summary).toBe("🎑 Seventh Hexadecan");
      expect(event.description).toBe("Seventh Hexadecan");
    });

    it("creates ninth hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-09-30T12:00:00.000Z");

      const event = service.buildNinthHexadecanEvent(timestamp);

      expect(event.summary).toBe("🍁 Ninth Hexadecan");
      expect(event.description).toBe("Ninth Hexadecan");
    });

    it("creates eleventh hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-11-14T12:00:00.000Z");

      const event = service.buildEleventhHexadecanEvent(timestamp);

      expect(event.summary).toBe("🧤 Eleventh Hexadecan");
      expect(event.description).toBe("Eleventh Hexadecan");
    });

    it("creates thirteenth hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-12-29T12:00:00.000Z");

      const event = service.buildThirteenthHexadecanEvent(timestamp);

      expect(event.summary).toBe("❄️ Thirteenth Hexadecan");
      expect(event.description).toBe("Thirteenth Hexadecan");
    });

    it("creates fifteenth hexadecan event with correct structure", () => {
      const timestamp = moment.utc("2024-02-12T12:00:00.000Z");

      const event = service.buildFifteenthHexadecanEvent(timestamp);

      expect(event.summary).toBe("🌨️ Fifteenth Hexadecan");
      expect(event.description).toBe("Fifteenth Hexadecan");
    });

    it("creates aphelion event with correct structure", () => {
      const timestamp = moment.utc("2024-07-05T12:00:00.000Z");

      const event = service.buildAphelionEvent(timestamp);

      expect(event.summary).toBe("☀️ ❄️ Solar Aphelion");
      expect(event.description).toBe("Solar Aphelion");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
      expect(event.categories).toContain("Astronomy");
      expect(event.categories).toContain("Astrology");
      expect(event.categories).toContain("Annual Solar Cycle");
      expect(event.categories).toContain("Solar");
      expect(event.categories).toContain("Aphelion");
    });

    it("creates perihelion event with correct structure", () => {
      const timestamp = moment.utc("2024-01-03T12:00:00.000Z");

      const event = service.buildPerihelionEvent(timestamp);

      expect(event.summary).toBe("☀️ 🔥 Solar Perihelion");
      expect(event.description).toBe("Solar Perihelion");
      expect(event.categories).toContain("Perihelion");
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("seasonal event groups", () => {
    it("collects spring and summer events when thresholds are crossed", () => {
      const minute = moment.utc("2024-03-20T03:06:00.000Z");
      const cases = [
        {
          expectedDescription: "Vernal Equinox",
          longitudes: { currentLongitude: 1, previousLongitude: 359 },
        },
        {
          expectedDescription: "First Hexadecan",
          longitudes: { currentLongitude: 23, previousLongitude: 22 },
        },
        {
          expectedDescription: "Beltane",
          longitudes: { currentLongitude: 46, previousLongitude: 44 },
        },
        {
          expectedDescription: "Third Hexadecan",
          longitudes: { currentLongitude: 68, previousLongitude: 67 },
        },
        {
          expectedDescription: "Summer Solstice",
          longitudes: { currentLongitude: 91, previousLongitude: 89 },
        },
        {
          expectedDescription: "Fifth Hexadecan",
          longitudes: { currentLongitude: 113, previousLongitude: 112 },
        },
        {
          expectedDescription: "Lammas",
          longitudes: { currentLongitude: 136, previousLongitude: 134 },
        },
        {
          expectedDescription: "Seventh Hexadecan",
          longitudes: { currentLongitude: 158, previousLongitude: 157 },
        },
      ] as const;

      for (const { expectedDescription, longitudes } of cases) {
        const events = service.getVernalToAutumnalEvents(longitudes, minute);

        expect(events).toHaveLength(1);
        expect(events[0]?.description).toBe(expectedDescription);
      }
    });

    it("collects autumn and winter events when thresholds are crossed", () => {
      const minute = moment.utc("2024-09-22T12:43:00.000Z");
      const cases = [
        {
          expectedDescription: "Autumnal Equinox",
          longitudes: { currentLongitude: 181, previousLongitude: 179 },
        },
        {
          expectedDescription: "Ninth Hexadecan",
          longitudes: { currentLongitude: 203, previousLongitude: 202 },
        },
        {
          expectedDescription: "Samhain",
          longitudes: { currentLongitude: 226, previousLongitude: 224 },
        },
        {
          expectedDescription: "Eleventh Hexadecan",
          longitudes: { currentLongitude: 248, previousLongitude: 247 },
        },
        {
          expectedDescription: "Winter Solstice",
          longitudes: { currentLongitude: 271, previousLongitude: 269 },
        },
        {
          expectedDescription: "Thirteenth Hexadecan",
          longitudes: { currentLongitude: 293, previousLongitude: 292 },
        },
        {
          expectedDescription: "Imbolc",
          longitudes: { currentLongitude: 316, previousLongitude: 314 },
        },
        {
          expectedDescription: "Fifteenth Hexadecan",
          longitudes: { currentLongitude: 338, previousLongitude: 337 },
        },
      ] as const;

      for (const { expectedDescription, longitudes } of cases) {
        const events = service.getAutumnalToVernalEvents(longitudes, minute);

        expect(events).toHaveLength(1);
        expect(events[0]?.description).toBe(expectedDescription);
      }
    });
  });

  describe("longitude thresholds", () => {
    it("returns true when crossing 0° (from Pisces to Aries)", () => {
      const result = service.isVernalEquinox({
        currentLongitude: 1,
        previousLongitude: 359,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing the boundary", () => {
      const result = service.isVernalEquinox({
        currentLongitude: 10,
        previousLongitude: 5,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 22.5°", () => {
      const result = service.isFirstHexadecan({
        currentLongitude: 23,
        previousLongitude: 22,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 22.5°", () => {
      const result = service.isFirstHexadecan({
        currentLongitude: 21,
        previousLongitude: 20,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 45°", () => {
      const result = service.isBeltane({
        currentLongitude: 46,
        previousLongitude: 44,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 45°", () => {
      const result = service.isBeltane({
        currentLongitude: 44,
        previousLongitude: 43,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 67.5°", () => {
      const result = service.isThirdHexadecan({
        currentLongitude: 68,
        previousLongitude: 67,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 67.5°", () => {
      const result = service.isThirdHexadecan({
        currentLongitude: 66,
        previousLongitude: 65,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 90°", () => {
      const result = service.isSummerSolstice({
        currentLongitude: 91,
        previousLongitude: 89,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 90°", () => {
      const result = service.isSummerSolstice({
        currentLongitude: 88,
        previousLongitude: 87,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 112.5°", () => {
      const result = service.isFifthHexadecan({
        currentLongitude: 113,
        previousLongitude: 112,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 112.5°", () => {
      const result = service.isFifthHexadecan({
        currentLongitude: 111,
        previousLongitude: 110,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 135°", () => {
      const result = service.isLammas({
        currentLongitude: 136,
        previousLongitude: 134,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 135°", () => {
      const result = service.isLammas({
        currentLongitude: 133,
        previousLongitude: 132,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 157.5°", () => {
      const result = service.isSeventhHexadecan({
        currentLongitude: 158,
        previousLongitude: 157,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 157.5°", () => {
      const result = service.isSeventhHexadecan({
        currentLongitude: 156,
        previousLongitude: 155,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 180°", () => {
      const result = service.isAutumnalEquinox({
        currentLongitude: 181,
        previousLongitude: 179,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 180°", () => {
      const result = service.isAutumnalEquinox({
        currentLongitude: 178,
        previousLongitude: 177,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 202.5°", () => {
      const result = service.isNinthHexadecan({
        currentLongitude: 203,
        previousLongitude: 202,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 202.5°", () => {
      const result = service.isNinthHexadecan({
        currentLongitude: 201,
        previousLongitude: 200,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 225°", () => {
      const result = service.isSamhain({
        currentLongitude: 226,
        previousLongitude: 224,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 225°", () => {
      const result = service.isSamhain({
        currentLongitude: 223,
        previousLongitude: 222,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 247.5°", () => {
      const result = service.isEleventhHexadecan({
        currentLongitude: 248,
        previousLongitude: 247,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 247.5°", () => {
      const result = service.isEleventhHexadecan({
        currentLongitude: 246,
        previousLongitude: 245,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 270°", () => {
      const result = service.isWinterSolstice({
        currentLongitude: 271,
        previousLongitude: 269,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 270°", () => {
      const result = service.isWinterSolstice({
        currentLongitude: 268,
        previousLongitude: 267,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 292.5°", () => {
      const result = service.isThirteenthHexadecan({
        currentLongitude: 293,
        previousLongitude: 292,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 292.5°", () => {
      const result = service.isThirteenthHexadecan({
        currentLongitude: 291,
        previousLongitude: 290,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 315°", () => {
      const result = service.isImbolc({
        currentLongitude: 316,
        previousLongitude: 314,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 315°", () => {
      const result = service.isImbolc({
        currentLongitude: 313,
        previousLongitude: 312,
      });

      expect(result).toBe(false);
    });

    it("returns true when crossing 337.5°", () => {
      const result = service.isFifteenthHexadecan({
        currentLongitude: 338,
        previousLongitude: 337,
      });

      expect(result).toBe(true);
    });

    it("returns false when not crossing 337.5°", () => {
      const result = service.isFifteenthHexadecan({
        currentLongitude: 336,
        previousLongitude: 335,
      });

      expect(result).toBe(false);
    });
  });
});
