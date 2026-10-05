import { createMock } from "@golevelup/ts-vitest";
import moment, { type Moment } from "moment-timezone";
import { describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import {
  ingressBodies as decanIngressBodies,
  ingressBodies as peakIngressBodies,
  ingressBodies as signIngressBodies,
} from "../caelundas/caelundas.constants";
import { EphemerisService } from "../ephemeris/ephemeris.service";

import { IngressesComposerService } from "./ingresses-composer.service";
import { IngressesService } from "./ingresses.service";

import type { Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { EphemerisAggregationService } from "../ephemeris/ephemeris-aggregation.service";
import type { EphemerisConstantsService } from "../ephemeris/ephemeris-constants.service";
import type { EphemerisCoordinateService } from "../ephemeris/ephemeris-coordinate.service";
import type { EphemerisHorizonService } from "../ephemeris/ephemeris-horizon.service";
import type { EphemerisPhenomenaService } from "../ephemeris/ephemeris-phenomena.service";
import type { EphemerisTimeService } from "../ephemeris/ephemeris-time.service";
import type { CoordinateEphemeris } from "../ephemeris/ephemeris.types";

// Helper to create full ephemeris for all required bodies with default stationary values
function createFullEphemeris(
  baseTime: Moment,
  bodies: readonly Body[],
  overrides: Partial<
    Record<Body, { current: number; next: number; previous: number }>
  > = {},
): Record<Body, CoordinateEphemeris> {
  const result: Record<string, CoordinateEphemeris> = {};
  const defaultLongitude = 100; // Default position away from any boundaries

  for (const body of bodies) {
    const override = overrides[body];
    result[body] = {
      [baseTime.clone().add(1, "minute").toISOString()]: {
        latitude: 0,
        longitude: override?.next ?? defaultLongitude,
      },
      [baseTime.clone().subtract(1, "minute").toISOString()]: {
        latitude: 0,
        longitude: override?.previous ?? defaultLongitude,
      },
      [baseTime.toISOString()]: {
        latitude: 0,
        longitude: override?.current ?? defaultLongitude,
      },
    };
  }

  return result;
}

const ephemerisService = new EphemerisService(
  createMock<EphemerisAggregationService>(),
  createMock<EphemerisCoordinateService>(),
  createMock<EphemerisConstantsService>(),
  createMock<EphemerisHorizonService>(),
  createMock<EphemerisPhenomenaService>(),
  createMock<EphemerisTimeService>(),
);
const logger = new LoggerService();
const helperService = new IngressesComposerService(logger, ephemerisService);
const service = new IngressesService(helperService, logger);

describe("ingresses.events integration", () => {
  describe("service.getSignIngressEvents", () => {
    it("detects Sun entering Aries (Vernal Equinox)", () => {
      const baseTime = moment.utc("2025-03-20T09:06:00Z");

      // Sun crossing from Pisces (359.9°) to Aries (0.1°)
      const coordinateEphemerisByBody = createFullEphemeris(
        baseTime,
        signIngressBodies,
        {
          sun: { current: 0.1, next: 0.2, previous: 359.9 },
        },
      );

      const events = service.getSignIngressEvents({
        coordinateEphemerisByBody,
        minute: baseTime,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Aries");
      expect(events[0]?.categories).toContain("Ingress");
      expect(events[0]?.summary).toContain("☀️");
      expect(events[0]?.summary).toContain("♈");
    });

    it("detects Moon sign changes", () => {
      const baseTime = moment.utc("2025-01-15T18:30:00Z");

      // Moon crossing from Taurus (59.9°) to Gemini (60.1°)
      const coordinateEphemerisByBody = createFullEphemeris(
        baseTime,
        signIngressBodies,
        {
          moon: { current: 60.1, next: 60.3, previous: 59.9 },
        },
      );

      const events = service.getSignIngressEvents({
        coordinateEphemerisByBody,
        minute: baseTime,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Moon");
      expect(events[0]?.categories).toContain("Gemini");
    });

    it("does not generate event when body stays in same sign", () => {
      const baseTime = moment.utc("2025-02-10T12:00:00Z");

      // All bodies stay in their default positions (no boundary crossings)
      const coordinateEphemerisByBody = createFullEphemeris(
        baseTime,
        signIngressBodies,
      );

      const events = service.getSignIngressEvents({
        coordinateEphemerisByBody,
        minute: baseTime,
      });

      expect(events).toHaveLength(0);
    });
  });

  describe("service.getDecanIngressEvents", () => {
    it("detects decan change within same sign", () => {
      const baseTime = moment.utc("2025-04-05T16:00:00Z");

      // Sun crossing from decan 1 (9.9°) to decan 2 (10.1°) in Aries
      const coordinateEphemerisByBody = createFullEphemeris(
        baseTime,
        decanIngressBodies,
        {
          sun: { current: 10.1, next: 10.2, previous: 9.9 },
        },
      );

      const events = service.getDecanIngressEvents({
        coordinateEphemerisByBody,
        minute: baseTime,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Decan");
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Aries");
    });

    it("does not generate decan event when crossing sign boundary (sign event takes precedence)", () => {
      const baseTime = moment.utc("2025-04-19T22:00:00Z");

      // Sun crossing from Aries (29.9°) to Taurus (30.1°)
      const coordinateEphemerisByBody = createFullEphemeris(
        baseTime,
        decanIngressBodies,
        {
          sun: { current: 30.1, next: 30.2, previous: 29.9 },
        },
      );

      const events = service.getDecanIngressEvents({
        coordinateEphemerisByBody,
        minute: baseTime,
      });

      // Should be 0 because sign ingress takes precedence
      expect(events).toHaveLength(0);
    });
  });

  describe("service.getPeakIngressEvents", () => {
    it("detects peak ingress at 15° within a sign", () => {
      const baseTime = moment.utc("2025-05-05T08:00:00Z");

      // Sun crossing 15° in Taurus (30 + 15 = 45°)
      const coordinateEphemerisByBody = createFullEphemeris(
        baseTime,
        peakIngressBodies,
        {
          sun: { current: 45.1, next: 45.2, previous: 44.9 },
        },
      );

      const events = service.getPeakIngressEvents({
        coordinateEphemerisByBody,
        minute: baseTime,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Peak");
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Taurus");
    });
  });

  describe("detectProgressive", () => {
    it("creates progressive events from consecutive sign ingresses", () => {
      const events: Event[] = [
        {
          categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Aries"],
          description: "Sun ingress Aries",
          end: moment.utc("2025-03-20T09:06:00Z"),
          start: moment.utc("2025-03-20T09:06:00Z"),
          summary: "☀️ → ♈ Sun ingress Aries",
        },
        {
          categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Taurus"],
          description: "Sun ingress Taurus",
          end: moment.utc("2025-04-19T20:00:00Z"),
          start: moment.utc("2025-04-19T20:00:00Z"),
          summary: "☀️ → ♉︎ Sun ingress Taurus",
        },
        {
          categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Gemini"],
          description: "Sun ingress Gemini",
          end: moment.utc("2025-05-20T19:00:00Z"),
          start: moment.utc("2025-05-20T19:00:00Z"),
          summary: "☀️ → ♊︎ Sun ingress Gemini",
        },
      ];

      const progressiveEvents = service.detectProgressive(events);

      expect(progressiveEvents).toHaveLength(2);

      // First duration: Sun in Aries
      expect(progressiveEvents[0]?.start.toISOString()).toBe(
        "2025-03-20T09:06:00.000Z",
      );
      expect(progressiveEvents[0]?.end.toISOString()).toBe(
        "2025-04-19T20:00:00.000Z",
      );
      expect(progressiveEvents[0]?.description).toContain("Sun");
      expect(progressiveEvents[0]?.description).toContain("Aries");

      // Second duration: Sun in Taurus
      expect(progressiveEvents[1]?.start.toISOString()).toBe(
        "2025-04-19T20:00:00.000Z",
      );
      expect(progressiveEvents[1]?.end.toISOString()).toBe(
        "2025-05-20T19:00:00.000Z",
      );
    });

    it("handles events for multiple bodies separately", () => {
      const events: Event[] = [
        {
          categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Aquarius"],
          description: "Sun ingress Aquarius",
          end: moment.utc("2025-01-10T10:00:00Z"),
          start: moment.utc("2025-01-10T10:00:00Z"),
          summary: "Sun ingress Aquarius",
        },
        {
          categories: ["Astronomy", "Astrology", "Ingress", "Moon", "Gemini"],
          description: "Moon ingress Gemini",
          end: moment.utc("2025-01-12T08:00:00Z"),
          start: moment.utc("2025-01-12T08:00:00Z"),
          summary: "Moon ingress Gemini",
        },
        {
          categories: ["Astronomy", "Astrology", "Ingress", "Moon", "Cancer"],
          description: "Moon ingress Cancer",
          end: moment.utc("2025-01-14T15:00:00Z"),
          start: moment.utc("2025-01-14T15:00:00Z"),
          summary: "Moon ingress Cancer",
        },
        {
          categories: ["Astronomy", "Astrology", "Ingress", "Sun", "Pisces"],
          description: "Sun ingress Pisces",
          end: moment.utc("2025-02-18T12:00:00Z"),
          start: moment.utc("2025-02-18T12:00:00Z"),
          summary: "Sun ingress Pisces",
        },
      ];

      const progressiveEvents = service.detectProgressive(events);

      // Should have: Sun in Aquarius, Moon in Gemini
      expect(progressiveEvents).toHaveLength(2);

      const sunDuration = progressiveEvents.find((e) =>
        e.categories.includes("Sun"),
      );
      const moonDuration = progressiveEvents.find((e) =>
        e.categories.includes("Moon"),
      );

      expect(sunDuration).toBeDefined();
      expect(moonDuration).toBeDefined();

      expect(sunDuration?.start.toISOString()).toBe("2025-01-10T10:00:00.000Z");
      expect(sunDuration?.end.toISOString()).toBe("2025-02-18T12:00:00.000Z");

      expect(moonDuration?.start.toISOString()).toBe(
        "2025-01-12T08:00:00.000Z",
      );
      expect(moonDuration?.end.toISOString()).toBe("2025-01-14T15:00:00.000Z");
    });
  });
});
