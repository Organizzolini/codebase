import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { EphemerisConstantsService } from "./ephemeris-constants.service";

describe(EphemerisConstantsService, () => {
  let service: EphemerisConstantsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [EphemerisConstantsService],
    }).compile();

    service = await module.resolve(EphemerisConstantsService);
  });

  describe("isNode", () => {
    it("returns true for node bodies", () => {
      expect(service.isNode("north lunar node")).toBe(true);
      expect(service.isNode("south lunar node")).toBe(true);
      expect(service.isNode("lunar perigee")).toBe(true);
    });

    it("returns false for non-node bodies", () => {
      expect(service.isNode("sun")).toBe(false);
      expect(service.isNode("moon")).toBe(false);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSwissEphemerisConstantForBody", () => {
    it("returns a constant for a planet", () => {
      expect(typeof service.getSwissEphemerisConstantForBody("sun")).toBe(
        "number",
      );
    });

    it("returns a constant for an asteroid", () => {
      expect(typeof service.getSwissEphemerisConstantForBody("ceres")).toBe(
        "number",
      );
    });

    it("throws when no constant is configured", () => {
      expect(() =>
        service.getSwissEphemerisConstantForBody("halley" as never),
      ).toThrow('No Swiss Ephemeris constant for body "halley"');
    });
  });
});
