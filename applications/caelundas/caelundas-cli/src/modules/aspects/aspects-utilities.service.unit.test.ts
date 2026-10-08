import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { majorAspects } from "../caelundas/caelundas.constants";
import { MathService } from "../math/math.service";

import { AspectsUtilitiesService } from "./aspects-utilities.service";

import type { Aspect, AspectPhase } from "../caelundas/caelundas.types";

type LongitudeWindow = readonly [
  previous: number,
  current: number,
  next: number,
];

describe(AspectsUtilitiesService, () => {
  let service: AspectsUtilitiesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AspectsUtilitiesService, MathService],
    }).compile();

    service = await module.resolve(AspectsUtilitiesService);
  });

  const detect = (args: {
    aspects: Aspect[];
    body1: LongitudeWindow;
    body2: LongitudeWindow;
  }): AspectPhase | null => {
    const { aspects, body1, body2 } = args;
    return service.getIsAspect(aspects)({
      currentLongitudeBody1: body1[1],
      currentLongitudeBody2: body2[1],
      nextLongitudeBody1: body1[2],
      nextLongitudeBody2: body2[2],
      previousLongitudeBody1: body1[0],
      previousLongitudeBody2: body2[0],
    });
  };

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("getIsAspect opposition perfection", () => {
    it("is perfective when the separation crosses 180°", () => {
      expect(
        detect({
          aspects: ["opposite"],
          body1: [0, 0, 0],
          body2: [179.8, 180.1, 180.4],
        }),
      ).toBe("perfective");
    });

    it("is perfective when the separation crosses 180° from the other side", () => {
      expect(
        detect({
          aspects: ["opposite"],
          body1: [0, 0, 0],
          body2: [180.3, 179.9, 179.5],
        }),
      ).toBe("perfective");
    });

    it("is perfective when the crossing straddles 0° Aries", () => {
      expect(
        detect({
          aspects: ["opposite"],
          body1: [359.9, 0.1, 0.3],
          body2: [180, 180, 180],
        }),
      ).toBe("perfective");
    });

    it("is perfective once when the separation lands exactly on 180°", () => {
      expect(
        detect({
          aspects: ["opposite"],
          body1: [0, 0, 0],
          body2: [179.9, 180, 180.1],
        }),
      ).toBe("perfective");
      expect(
        detect({
          aspects: ["opposite"],
          body1: [0, 0, 0],
          body2: [180, 180.1, 180.2],
        }),
      ).toBeNull();
    });

    it("is perfective among all major aspects", () => {
      expect(
        detect({
          aspects: [...majorAspects],
          body1: [100, 100, 100],
          body2: [279.9, 280.1, 280.3],
        }),
      ).toBe("perfective");
    });

    it("is not perfective while approaching 180° without crossing", () => {
      expect(
        detect({
          aspects: ["opposite"],
          body1: [0, 0, 0],
          body2: [178, 178.5, 179],
        }),
      ).toBeNull();
    });

    it("is not perfective at a near-miss opposition that turns back", () => {
      expect(
        detect({
          aspects: ["opposite"],
          body1: [0, 0, 0],
          body2: [177.9, 178, 177.9],
        }),
      ).toBeNull();
    });
  });

  describe("getIsAspect conjunction perfection", () => {
    it("is perfective when the bodies pass each other", () => {
      expect(
        detect({
          aspects: ["conjunct"],
          body1: [99.8, 100.1, 100.4],
          body2: [100, 100, 100],
        }),
      ).toBe("perfective");
    });

    it("is perfective when the bodies meet across 0° Aries", () => {
      expect(
        detect({
          aspects: ["conjunct"],
          body1: [359.9, 0.1, 0.3],
          body2: [0, 0, 0],
        }),
      ).toBe("perfective");
    });

    it("is not perfective at a separation maximum inside the orb", () => {
      expect(
        detect({
          aspects: ["conjunct"],
          body1: [105, 105.2, 105],
          body2: [100, 100, 100],
        }),
      ).toBeNull();
    });

    it("is not perfective at a near-miss minimum that never reaches 0°", () => {
      expect(
        detect({
          aspects: ["conjunct"],
          body1: [107.9, 107.8, 107.9],
          body2: [100, 100, 100],
        }),
      ).toBeNull();
    });

    it("still forms and dissolves around a tangent near miss", () => {
      expect(
        detect({
          aspects: ["conjunct"],
          body1: [108.1, 107.95, 107.9],
          body2: [100, 100, 100],
        }),
      ).toBe("forming");
      expect(
        detect({
          aspects: ["conjunct"],
          body1: [107.9, 107.95, 108.1],
          body2: [100, 100, 100],
        }),
      ).toBe("dissolving");
    });

    it("does not treat the ±180° wrap as a conjunction", () => {
      expect(
        detect({
          aspects: ["conjunct"],
          body1: [0, 0, 0],
          body2: [179.9, 180.1, 180.3],
        }),
      ).toBeNull();
    });
  });
});
