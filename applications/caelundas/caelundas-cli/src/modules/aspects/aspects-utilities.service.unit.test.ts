import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MathService } from "../math/math.service";

import { AspectsUtilitiesService } from "./aspects-utilities.service";

describe(AspectsUtilitiesService, () => {
  let service: AspectsUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectsUtilitiesService, MathService],
    }).compile();

    service = await module.resolve(AspectsUtilitiesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getActiveAspectBodies", () => {
    const longitudes: Record<string, { current: number; previous: number }> = {
      mars: { current: 140, previous: 140 },
      mercury: { current: 231, previous: 229 },
      pluto: { current: 323, previous: 323 },
      sun: { current: 186.5, previous: 186.6 },
    };

    it("lists each pair held in an aspect at the previous minute and this one", () => {
      const active = service.getActiveAspectBodies({
        aspects: ["conjunct", "opposite", "square"],
        bodies: ["mars", "mercury", "pluto"],
        getLongitudes: (body) =>
          longitudes[body] ?? { current: 0, previous: 0 },
      });

      expect(active).toStrictEqual([
        { aspect: "square", bodies: ["mars", "mercury"] },
        { aspect: "opposite", bodies: ["mars", "pluto"] },
        { aspect: "square", bodies: ["mercury", "pluto"] },
      ]);
    });

    it("leaves out a pair that only enters orb at this minute", () => {
      const active = service.getActiveAspectBodies({
        aspects: ["opposite"],
        bodies: ["sun", "pluto"],
        getLongitudes: (body) =>
          body === "sun"
            ? { current: 135.1, previous: 134.9 }
            : (longitudes[body] ?? { current: 0, previous: 0 }),
      });

      expect(active).toStrictEqual([]);
    });

    it("only considers the aspects it is given", () => {
      const active = service.getActiveAspectBodies({
        aspects: ["trine"],
        bodies: ["mars", "pluto"],
        getLongitudes: (body) =>
          longitudes[body] ?? { current: 0, previous: 0 },
      });

      expect(active).toStrictEqual([]);
    });
  });
});
