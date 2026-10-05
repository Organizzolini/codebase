import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import {
  ingressBodies as decanIngressBodies,
  ingressBodies as peakIngressBodies,
  ingressBodies as signIngressBodies,
} from "../caelundas/caelundas.constants";
import { EphemerisModule } from "../ephemeris/ephemeris.module";
import { MathService } from "../math/math.service";

import { IngressesComposerService } from "./ingresses-composer.service";
import { IngressesService } from "./ingresses.service";

import type { Body } from "../caelundas/caelundas.types";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

interface ServicePrivate {
  getDecan: (longitude: number) => number;
  isDecanIngress: (args: {
    currentLongitude: number;
    previousLongitude: number;
  }) => boolean;
  isPeakIngress: (args: {
    currentLongitude: number;
    previousLongitude: number;
  }) => boolean;
  isSignIngress: (args: {
    currentLongitude: number;
    previousLongitude: number;
  }) => boolean;
}

describe(IngressesService, () => {
  let service: IngressesService;
  let helperService: IngressesComposerService;
  let s: ServicePrivate;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EphemerisModule],
      providers: [
        IngressesComposerService,
        IngressesService,
        LoggerService,
        MathService,
      ],
    }).compile();
    service = await module.resolve(IngressesService);
    helperService = await module.resolve(IngressesComposerService);
    s = helperService;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSignIngressEvent", () => {
    it("creates a sign ingress event for Sun entering Aries", () => {
      const event = service.buildSignIngressEvent({
        body: "sun",
        date: moment.utc("2024-03-20T03:06:00.000Z"),
        longitude: 0, // 0° = Aries
      });

      expect(event).toMatchObject({
        categories: expect.arrayContaining<string>([
          "Astronomy",
          "Astrology",
          "Ingress",
        ]) as string[],
        description: expect.stringContaining("Sun") as string,
        end: moment.utc("2024-03-20T03:06:00.000Z"),
        start: moment.utc("2024-03-20T03:06:00.000Z"),
        summary: expect.stringContaining("Aries") as string,
      });
      expect(event.categories).toContain("Aries");
      expect(event.categories).toContain("Sun");
    });

    it("creates a sign ingress event for Moon entering Taurus", () => {
      const event = service.buildSignIngressEvent({
        body: "moon",
        date: moment.utc("2024-03-15T12:30:00.000Z"),
        longitude: 30, // 30° = Taurus
      });

      expect(event.summary).toContain("Taurus");
      expect(event.description).toContain("Moon");
      expect(event.categories).toContain("Taurus");
      expect(event.categories).toContain("Moon");
    });
  });

  describe("getSignIngressEvents", () => {
    it("detects sign ingress when longitude crosses sign boundary", () => {
      const currentMinute = moment("2024-03-20T03:06:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");

      // Create ephemeris for all bodies with NaN longitudes except sun
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      for (const body of signIngressBodies) {
        coordinateEphemerisByBody[body] = {
          [currentMinute.toISOString()]: { latitude: 0, longitude: Number.NaN },
          [previousMinute.toISOString()]: {
            latitude: 0,
            longitude: Number.NaN,
          },
        };
      }

      // Sun crossing from Pisces (359.9°) to Aries (0.1°)
      coordinateEphemerisByBody.sun = {
        [currentMinute.toISOString()]: { latitude: 0, longitude: 0.1 },
        [previousMinute.toISOString()]: { latitude: 0, longitude: 359.9 },
      };

      const events = service.getSignIngressEvents({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.summary).toContain("Aries");
      expect(events[0]?.categories).toContain("Sun");
    });

    it("does not detect ingress when no boundary is crossed", () => {
      const currentMinute = moment("2024-03-15T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");

      // Create ephemeris for all bodies with NaN longitudes except moon
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      for (const body of signIngressBodies) {
        coordinateEphemerisByBody[body] = {
          [currentMinute.toISOString()]: { latitude: 0, longitude: Number.NaN },
          [previousMinute.toISOString()]: {
            latitude: 0,
            longitude: Number.NaN,
          },
        };
      }

      // Moon at 45.5° Taurus (no boundary crossing)
      coordinateEphemerisByBody.moon = {
        [currentMinute.toISOString()]: { latitude: 0, longitude: 45.5 },
        [previousMinute.toISOString()]: { latitude: 0, longitude: 45.4 },
      };

      const events = service.getSignIngressEvents({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(0);
    });
  });

  describe("getDecanIngressEvent", () => {
    it("creates a decan ingress event", () => {
      const event = service.buildDecanIngressEvent({
        body: "venus",
        date: moment.utc("2024-04-05T10:00:00.000Z"),
        longitude: 10.5, // Decan 2 of Aries
      });

      expect(event).toMatchObject({
        end: moment.utc("2024-04-05T10:00:00.000Z"),
        start: moment.utc("2024-04-05T10:00:00.000Z"),
      });
      expect(event.categories).toContain("Decan");
      expect(event.categories).toContain("Aries");
      expect(event.categories).toContain("Venus");
    });
  });

  describe("getDecanIngressEvents", () => {
    it("detects decan ingress but exclude sign ingress", () => {
      const currentMinute = moment("2024-04-05T10:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");

      // Create ephemeris for all bodies with NaN longitudes except venus
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      for (const body of decanIngressBodies) {
        coordinateEphemerisByBody[body] = {
          [currentMinute.toISOString()]: { latitude: 0, longitude: Number.NaN },
          [previousMinute.toISOString()]: {
            latitude: 0,
            longitude: Number.NaN,
          },
        };
      }

      // Venus crossing decan boundary at 10°
      coordinateEphemerisByBody.venus = {
        [currentMinute.toISOString()]: { latitude: 0, longitude: 10.1 },
        [previousMinute.toISOString()]: { latitude: 0, longitude: 9.9 },
      };

      const events = service.getDecanIngressEvents({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Decan");
    });

    it("does not detect ingress when no decan boundary is crossed", () => {
      const currentMinute = moment("2024-04-10T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");

      // Create ephemeris for all bodies with NaN longitudes except venus
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      for (const body of decanIngressBodies) {
        coordinateEphemerisByBody[body] = {
          [currentMinute.toISOString()]: { latitude: 0, longitude: Number.NaN },
          [previousMinute.toISOString()]: {
            latitude: 0,
            longitude: Number.NaN,
          },
        };
      }

      // Venus at 15.5° Aries (no decan boundary)
      coordinateEphemerisByBody.venus = {
        [currentMinute.toISOString()]: { latitude: 0, longitude: 15.5 },
        [previousMinute.toISOString()]: { latitude: 0, longitude: 15.4 },
      };

      const events = service.getDecanIngressEvents({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(0);
    });
  });

  describe("getPeakIngressEvent", () => {
    it("creates a peak ingress event", () => {
      const event = service.buildPeakIngressEvent({
        body: "mars",
        date: moment.utc("2024-06-15T16:00:00.000Z"),
        longitude: 135, // 15° Leo (120° + 15°)
      });

      expect(event).toMatchObject({
        end: moment.utc("2024-06-15T16:00:00.000Z"),
        start: moment.utc("2024-06-15T16:00:00.000Z"),
      });
      expect(event.categories).toContain("Peak");
      expect(event.categories).toContain("Leo");
      expect(event.categories).toContain("Mars");
    });
  });

  describe("getPeakIngressEvents", () => {
    it("detects peak ingress when crossing 15° midpoint", () => {
      const currentMinute = moment("2024-06-15T16:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");

      // Create ephemeris for all bodies with NaN longitudes except mars
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      for (const body of peakIngressBodies) {
        coordinateEphemerisByBody[body] = {
          [currentMinute.toISOString()]: { latitude: 0, longitude: Number.NaN },
          [previousMinute.toISOString()]: {
            latitude: 0,
            longitude: Number.NaN,
          },
        };
      }

      // Mars crossing 15° peak in Leo
      coordinateEphemerisByBody.mars = {
        [currentMinute.toISOString()]: { latitude: 0, longitude: 135.1 },
        [previousMinute.toISOString()]: { latitude: 0, longitude: 134.9 },
      };

      const events = service.getPeakIngressEvents({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Peak");
    });

    it("does not detect ingress when no peak boundary is crossed", () => {
      const currentMinute = moment("2024-06-20T12:00:00.000Z");
      const previousMinute = currentMinute.clone().subtract(1, "minute");

      // Create ephemeris for all bodies with NaN longitudes except mars
      const coordinateEphemerisByBody = {} as Record<Body, CoordinateEphemeris>;
      for (const body of peakIngressBodies) {
        coordinateEphemerisByBody[body] = {
          [currentMinute.toISOString()]: { latitude: 0, longitude: Number.NaN },
          [previousMinute.toISOString()]: {
            latitude: 0,
            longitude: Number.NaN,
          },
        };
      }

      // Mars at 140.5° (no peak boundary)
      coordinateEphemerisByBody.mars = {
        [currentMinute.toISOString()]: { latitude: 0, longitude: 140.5 },
        [previousMinute.toISOString()]: { latitude: 0, longitude: 140.4 },
      };

      const events = service.getPeakIngressEvents({
        coordinateEphemerisByBody,
        minute: currentMinute,
      });

      expect(events).toHaveLength(0);
    });
  });

  describe("getSignIngressProgressiveEvents", () => {
    it("creates progressive events for consecutive sign ingresses", () => {
      const events = [
        service.buildSignIngressEvent({
          body: "sun",
          date: moment.utc("2024-03-20T03:06:00.000Z"),
          longitude: 0,
        }),
        service.buildSignIngressEvent({
          body: "sun",
          date: moment.utc("2024-04-19T15:00:00.000Z"),
          longitude: 30,
        }),
      ];

      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.start).toStrictEqual(
        moment.utc("2024-03-20T03:06:00.000Z"),
      );
      expect(progressiveEvents[0]?.end).toStrictEqual(
        moment.utc("2024-04-19T15:00:00.000Z"),
      );
      expect(progressiveEvents[0]?.categories).toContain("Sun");
      expect(progressiveEvents[0]?.categories).toContain("Aries");
    });

    it("handles empty array", () => {
      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(0);
    });

    it("aggregates sign, decan, and peak ingress detection results", () => {
      const minute = moment.utc("2024-03-21T12:00:00.000Z");
      const detectSignSpy = vi
        .spyOn(service, "getSignIngressEvents")
        .mockReturnValue([
          {
            categories: ["Astronomy", "Astrology", "Ingress", "Sign"],
            description: "sign ingress",
            end: minute,
            start: minute,
            summary: "sign",
          },
        ]);
      const detectDecanSpy = vi
        .spyOn(service, "getDecanIngressEvents")
        .mockReturnValue([
          {
            categories: ["Astronomy", "Astrology", "Ingress", "Decan"],
            description: "decan ingress",
            end: minute,
            start: minute,
            summary: "decan",
          },
        ]);
      const detectPeakSpy = vi
        .spyOn(service, "getPeakIngressEvents")
        .mockReturnValue([
          {
            categories: ["Astronomy", "Astrology", "Ingress", "Peak"],
            description: "peak ingress",
            end: minute,
            start: minute,
            summary: "peak",
          },
        ]);

      const events = service.detect({
        coordinateEphemerisByBody: {} as Record<Body, CoordinateEphemeris>,
        minute,
      });

      expect(events).toHaveLength(3);

      detectSignSpy.mockRestore();
      detectDecanSpy.mockRestore();
      detectPeakSpy.mockRestore();
    });

    it("skips progressive processing for empty body group keys", () => {
      const groupedByBodySpy = vi
        .spyOn(helperService, "groupSignIngressEventsByBody")
        .mockReturnValue({
          "": [
            {
              categories: ["Astronomy", "Astrology", "Ingress", "Aries"],
              description: "anonymous ingress",
              end: moment.utc("2024-03-21T12:00:00.000Z"),
              start: moment.utc("2024-03-21T12:00:00.000Z"),
              summary: "anonymous ingress",
            },
          ],
          Sun: [
            {
              categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Aries"],
              description: "sun ingress aries",
              end: moment.utc("2024-03-21T12:00:00.000Z"),
              start: moment.utc("2024-03-21T12:00:00.000Z"),
              summary: "sun ingress aries",
            },
          ],
        });
      const filterSignIngressEventsSpy = vi
        .spyOn(helperService, "filterSignIngressEvents")
        .mockReturnValue([]);
      const buildProgressiveSpansForBodySpy = vi
        .spyOn(helperService, "buildProgressiveSpansForBody")
        .mockReturnValue([
          {
            categories: ["Astronomy", "Astrology", "Ingress", "Sun"],
            description: "sun span",
            end: moment.utc("2024-03-22T12:00:00.000Z"),
            start: moment.utc("2024-03-21T12:00:00.000Z"),
            summary: "sun span",
          },
        ]);

      const progressiveEvents = service.detectProgressive([]);

      expect(progressiveEvents).toHaveLength(1);
      expect(buildProgressiveSpansForBodySpy).toHaveBeenCalledTimes(1);
      expect(buildProgressiveSpansForBodySpy).toHaveBeenCalledWith(
        "Sun",
        expect.any(Array),
      );

      groupedByBodySpy.mockRestore();
      filterSignIngressEventsSpy.mockRestore();
      buildProgressiveSpansForBodySpy.mockRestore();
    });
  });

  describe("private utility methods", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    describe("degreeRangeBySign", () => {
      it("has correct ranges for all signs", () => {
        expect(IngressesService.degreeRangeBySign.aries).toStrictEqual({
          maximum: 30,
          minimum: 0,
        });
        expect(IngressesService.degreeRangeBySign.taurus).toStrictEqual({
          maximum: 60,
          minimum: 30,
        });
        expect(IngressesService.degreeRangeBySign.gemini).toStrictEqual({
          maximum: 90,
          minimum: 60,
        });
        expect(IngressesService.degreeRangeBySign.cancer).toStrictEqual({
          maximum: 120,
          minimum: 90,
        });
        expect(IngressesService.degreeRangeBySign.leo).toStrictEqual({
          maximum: 150,
          minimum: 120,
        });
        expect(IngressesService.degreeRangeBySign.virgo).toStrictEqual({
          maximum: 180,
          minimum: 150,
        });
        expect(IngressesService.degreeRangeBySign.libra).toStrictEqual({
          maximum: 210,
          minimum: 180,
        });
        expect(IngressesService.degreeRangeBySign.scorpio).toStrictEqual({
          maximum: 240,
          minimum: 210,
        });
        expect(IngressesService.degreeRangeBySign.sagittarius).toStrictEqual({
          maximum: 270,
          minimum: 240,
        });
        expect(IngressesService.degreeRangeBySign.capricorn).toStrictEqual({
          maximum: 300,
          minimum: 270,
        });
        expect(IngressesService.degreeRangeBySign.aquarius).toStrictEqual({
          maximum: 330,
          minimum: 300,
        });
        expect(IngressesService.degreeRangeBySign.pisces).toStrictEqual({
          maximum: 360,
          minimum: 330,
        });
      });
    });

    describe("getSign", () => {
      it("returns correct sign for start of each sign", () => {
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

      it("returns correct sign for middle of each sign", () => {
        expect(IngressesService.getSign(15)).toBe("aries");
        expect(IngressesService.getSign(45)).toBe("taurus");
        expect(IngressesService.getSign(75)).toBe("gemini");
        expect(IngressesService.getSign(105)).toBe("cancer");
        expect(IngressesService.getSign(135)).toBe("leo");
        expect(IngressesService.getSign(165)).toBe("virgo");
        expect(IngressesService.getSign(195)).toBe("libra");
        expect(IngressesService.getSign(225)).toBe("scorpio");
        expect(IngressesService.getSign(255)).toBe("sagittarius");
        expect(IngressesService.getSign(285)).toBe("capricorn");
        expect(IngressesService.getSign(315)).toBe("aquarius");
        expect(IngressesService.getSign(345)).toBe("pisces");
      });

      it("returns correct sign for end of each sign (exclusive)", () => {
        expect(IngressesService.getSign(29.99)).toBe("aries");
        expect(IngressesService.getSign(59.99)).toBe("taurus");
        expect(IngressesService.getSign(89.99)).toBe("gemini");
        expect(IngressesService.getSign(119.99)).toBe("cancer");
        expect(IngressesService.getSign(149.99)).toBe("leo");
        expect(IngressesService.getSign(179.99)).toBe("virgo");
        expect(IngressesService.getSign(209.99)).toBe("libra");
        expect(IngressesService.getSign(239.99)).toBe("scorpio");
        expect(IngressesService.getSign(269.99)).toBe("sagittarius");
        expect(IngressesService.getSign(299.99)).toBe("capricorn");
        expect(IngressesService.getSign(329.99)).toBe("aquarius");
        expect(IngressesService.getSign(359.99)).toBe("pisces");
      });

      it("throws for longitude outside 0-360 range", () => {
        expect(() => IngressesService.getSign(360)).toThrow(/longitude/i);
        expect(() => IngressesService.getSign(-1)).toThrow(/longitude/i);
        expect(() => IngressesService.getSign(400)).toThrow(/longitude/i);
      });
    });

    describe("composer edge cases", () => {
      it("throws when building sign ingress for an out-of-range longitude", () => {
        expect(() =>
          helperService.buildSignIngressEvent({
            body: "sun",
            date: moment.utc("2024-03-20T03:06:00.000Z"),
            longitude: 360,
          }),
        ).toThrow(/longitude/i);
      });

      it("skips progressive span creation when entering or exiting event is missing", () => {
        const sortBySpy = vi.spyOn(_, "sortBy").mockReturnValue([
          {
            categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Aries"],
            description: "Sun ingress Aries",
            end: moment.utc("2024-03-20T03:06:00.000Z"),
            start: moment.utc("2024-03-20T03:06:00.000Z"),
            summary: "Sun ingress Aries",
          },
          undefined,
        ] as unknown);

        expect(
          helperService.buildProgressiveSpansForBody("Sun", []),
        ).toStrictEqual([]);

        sortBySpy.mockRestore();
      });

      it("groups ingress events without a known body under an empty key", () => {
        const groupedEvents = helperService.groupSignIngressEventsByBody([
          {
            categories: ["Astronomy", "Astrology", "Ingress", "Aries"],
            description: "Anonymous ingress",
            end: moment.utc("2024-03-20T03:06:00.000Z"),
            start: moment.utc("2024-03-20T03:06:00.000Z"),
            summary: "Anonymous ingress",
          },
        ]);

        expect(groupedEvents[""]).toHaveLength(1);
      });

      it("throws when sign cannot be extracted from categories", () => {
        expect(() =>
          helperService.extractSignAndBodyFromCategories(
            ["Astronomy", "Astrology", "Ingress", "Sun"],
            "Sun",
          ),
        ).toThrow("Could not extract sign from categories");
      });

      it("throws when extracted categories cannot be cast to typed values", () => {
        expect(() =>
          helperService.extractSignAndBodyFromCategories(
            ["Astronomy", "Astrology", "Ingress", "Sun", "Aries"],
            "NotABody",
          ),
        ).toThrow("Could not extract typed values from categories");
      });

      it("throws when decan value is invalid", () => {
        const getDecanSpy = vi
          .spyOn(helperService, "getDecan")
          .mockReturnValue(4);

        expect(() => helperService.resolveDecan(10)).toThrow(
          "Invalid decan value: 4",
        );

        getDecanSpy.mockRestore();
      });
    });

    describe("isSignIngress", () => {
      it("returns true when crossing sign boundary", () => {
        expect(
          s.isSignIngress({ currentLongitude: 30.1, previousLongitude: 29.9 }),
        ).toBe(true);

        expect(
          s.isSignIngress({ currentLongitude: 0.1, previousLongitude: 359.9 }),
        ).toBe(true);
      });

      it("returns false when staying in same sign", () => {
        expect(
          s.isSignIngress({ currentLongitude: 16, previousLongitude: 15 }),
        ).toBe(false);

        expect(
          s.isSignIngress({ currentLongitude: 29.5, previousLongitude: 29 }),
        ).toBe(false);
      });
    });

    describe("getDecan", () => {
      it("returns decan 1 for degrees 0-9 within a sign", () => {
        expect(s.getDecan(0)).toBe(1);
        expect(s.getDecan(9)).toBe(1);
        expect(s.getDecan(30)).toBe(1);
        expect(s.getDecan(39)).toBe(1);
      });

      it("returns decan 2 for degrees 10-19 within a sign", () => {
        expect(s.getDecan(10)).toBe(2);
        expect(s.getDecan(19)).toBe(2);
        expect(s.getDecan(40)).toBe(2);
        expect(s.getDecan(49)).toBe(2);
      });

      it("returns decan 3 for degrees 20-29 within a sign", () => {
        expect(s.getDecan(20)).toBe(3);
        expect(s.getDecan(29)).toBe(3);
        expect(s.getDecan(50)).toBe(3);
        expect(s.getDecan(59)).toBe(3);
      });
    });

    describe("isDecanIngress", () => {
      it("returns true when crossing decan boundary within same sign", () => {
        expect(
          s.isDecanIngress({ currentLongitude: 10.1, previousLongitude: 9.9 }),
        ).toBe(true);

        expect(
          s.isDecanIngress({ currentLongitude: 20.1, previousLongitude: 19.9 }),
        ).toBe(true);
      });

      it("returns true when crossing sign boundary (also decan boundary)", () => {
        expect(
          s.isDecanIngress({ currentLongitude: 30.1, previousLongitude: 29.9 }),
        ).toBe(true);
      });

      it("returns false when staying in same decan", () => {
        expect(
          s.isDecanIngress({ currentLongitude: 6, previousLongitude: 5 }),
        ).toBe(false);

        expect(
          s.isDecanIngress({ currentLongitude: 16, previousLongitude: 15 }),
        ).toBe(false);
      });
    });

    describe("isPeakIngress", () => {
      it("returns true when crossing 15 degrees within a sign", () => {
        expect(
          s.isPeakIngress({ currentLongitude: 15.1, previousLongitude: 14.9 }),
        ).toBe(true);

        expect(
          s.isPeakIngress({ currentLongitude: 45.1, previousLongitude: 44.9 }),
        ).toBe(true);
      });

      it("returns false when not crossing 15 degrees", () => {
        expect(
          s.isPeakIngress({ currentLongitude: 11, previousLongitude: 10 }),
        ).toBe(false);

        expect(
          s.isPeakIngress({ currentLongitude: 17, previousLongitude: 16 }),
        ).toBe(false);
      });

      it("returns false when crossing sign boundary (not peak)", () => {
        expect(
          s.isPeakIngress({ currentLongitude: 30.1, previousLongitude: 29.9 }),
        ).toBe(false);
      });
    });
  });
});
