import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectsUtilitiesService } from "../aspects/aspects-utilities.service";
import { MathService } from "../math/math.service";

import { MajorAspectEventService } from "./major-aspect-event.service";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

describe(MajorAspectEventService, () => {
  let service: MajorAspectEventService;
  let aspectsUtilitiesService: AspectsUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoggerService,
        MajorAspectEventService,
        AspectsUtilitiesService,
        MathService,
      ],
    }).compile();

    service = await module.resolve(MajorAspectEventService);
    aspectsUtilitiesService = await module.resolve(AspectsUtilitiesService);
  });

  describe("buildMajorAspectEvent", () => {
    it("creates perfective conjunction event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMajorAspectEvent({
        body1: "sun",
        body2: "moon",
        longitudeBody1: 0,
        longitudeBody2: 0,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("🎯");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("🌙");
      expect(event.summary).toContain("☌");
      expect(event.description).toBe("Sun perfective conjunct Moon");
      expect(event.categories).toContain("Astronomy");
      expect(event.categories).toContain("Astrology");
      expect(event.categories).toContain("Major Aspect");
      expect(event.categories).toContain("Sun");
      expect(event.categories).toContain("Moon");
      expect(event.categories).toContain("Conjunct");
      expect(event.categories).toContain("Perfective");
      expect(event.start).toStrictEqual(timestamp);
      expect(event.end).toStrictEqual(timestamp);
    });

    it("creates forming opposition event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMajorAspectEvent({
        body1: "sun",
        body2: "mars",
        longitudeBody1: 0,
        longitudeBody2: 178,
        phase: "forming",
        timestamp,
      });

      expect(event.summary).toContain("➡️");
      expect(event.summary).toContain("☀️");
      expect(event.summary).toContain("♂️");
      expect(event.summary).toContain("☍");
      expect(event.description).toBe("Sun forming opposite Mars");
      expect(event.categories).toContain("Forming");
      expect(event.categories).toContain("Opposite");
    });

    it("creates dissolving trine event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMajorAspectEvent({
        body1: "venus",
        body2: "jupiter",
        longitudeBody1: 0,
        longitudeBody2: 122,
        phase: "dissolving",
        timestamp,
      });

      expect(event.summary).toContain("⬅️");
      expect(event.summary).toContain("♀️");
      expect(event.summary).toContain("♃");
      expect(event.summary).toContain("△");
      expect(event.description).toBe("Venus dissolving trine Jupiter");
      expect(event.categories).toContain("Dissolving");
      expect(event.categories).toContain("Trine");
      expect(event.categories).toContain("Venus");
      expect(event.categories).toContain("Jupiter");
    });

    it("creates square event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMajorAspectEvent({
        body1: "mercury",
        body2: "saturn",
        longitudeBody1: 0,
        longitudeBody2: 90,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("☿");
      expect(event.summary).toContain("♄");
      expect(event.summary).toContain("□");
      expect(event.description).toBe("Mercury perfective square Saturn");
      expect(event.categories).toContain("Square");
    });

    it("creates sextile event", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMajorAspectEvent({
        body1: "moon",
        body2: "uranus",
        longitudeBody1: 0,
        longitudeBody2: 60,
        phase: "perfective",
        timestamp,
      });

      expect(event.summary).toContain("🌙");
      expect(event.summary).toContain("♅");
      expect(event.summary).toContain("⚹");
      expect(event.description).toBe("Moon perfective sextile Uranus");
      expect(event.categories).toContain("Sextile");
    });

    it("throws error when no major aspect is found", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");

      expect(() =>
        service.buildMajorAspectEvent({
          body1: "sun",
          body2: "moon",
          longitudeBody1: 0,
          longitudeBody2: 45,
          phase: "perfective",
          timestamp,
        }),
      ).toThrow("No major aspect found");
    });

    it("handles wrapped longitudes (near 360/0 degrees)", () => {
      const timestamp = moment.utc("2024-03-21T12:00:00.000Z");
      const event = service.buildMajorAspectEvent({
        body1: "sun",
        body2: "moon",
        longitudeBody1: 358,
        longitudeBody2: 2,
        phase: "perfective",
        timestamp,
      });

      expect(event.description).toContain("conjunct");
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("isAspect", () => {
    it("returns true for conjunction within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "conjunct",
          longitudeBody1: 0,
          longitudeBody2: 5,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "conjunct",
          longitudeBody1: 100,
          longitudeBody2: 105,
        }),
      ).toBe(true);
    });

    it("returns false for conjunction outside orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "conjunct",
          longitudeBody1: 0,
          longitudeBody2: 10,
        }),
      ).toBe(false);
    });

    it("returns true for opposition within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "opposite",
          longitudeBody1: 0,
          longitudeBody2: 180,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "opposite",
          longitudeBody1: 0,
          longitudeBody2: 175,
        }),
      ).toBe(true);
    });

    it("returns true for trine within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "trine",
          longitudeBody1: 0,
          longitudeBody2: 120,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "trine",
          longitudeBody1: 0,
          longitudeBody2: 115,
        }),
      ).toBe(true);
    });

    it("returns true for square within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "square",
          longitudeBody1: 0,
          longitudeBody2: 90,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "square",
          longitudeBody1: 0,
          longitudeBody2: 85,
        }),
      ).toBe(true);
    });

    it("returns true for sextile within orb", () => {
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "sextile",
          longitudeBody1: 0,
          longitudeBody2: 60,
        }),
      ).toBe(true);
      expect(
        aspectsUtilitiesService.isAspect({
          aspect: "sextile",
          longitudeBody1: 0,
          longitudeBody2: 57,
        }),
      ).toBe(true);
    });
  });

  describe("getMajorAspect", () => {
    it("returns conjunct for bodies at same longitude", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 45, longitudeBody2: 45 }),
      ).toBe("conjunct");
    });

    it("returns conjunct for bodies within conjunction orb", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 45, longitudeBody2: 50 }),
      ).toBe("conjunct");
    });

    it("returns opposite for bodies 180° apart", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 180 }),
      ).toBe("opposite");
    });

    it("returns trine for bodies 120° apart", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 120 }),
      ).toBe("trine");
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 240 }),
      ).toBe("trine");
    });

    it("returns square for bodies 90° apart", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 90 }),
      ).toBe("square");
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 270 }),
      ).toBe("square");
    });

    it("returns sextile for bodies 60° apart", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 60 }),
      ).toBe("sextile");
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 300 }),
      ).toBe("sextile");
    });

    it("returns null when no major aspect is within orb", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 25 }),
      ).toBeNull();
      expect(
        service.getMajorAspect({ longitudeBody1: 0, longitudeBody2: 150 }),
      ).toBeNull();
    });

    it("handles wrapping around 360°", () => {
      expect(
        service.getMajorAspect({ longitudeBody1: 357, longitudeBody2: 2 }),
      ).toBe("conjunct");
    });
  });
});
