import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { MathService } from "../math/math.service";

import { AspectsUtilitiesService } from "./aspects-utilities.service";

import type { Body } from "../caelundas/caelundas.types";
import type { BodyLongitudesWindow } from "./aspects.types";

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
    const minute = moment.utc("2026-10-01T04:00:00Z");
    const steady = (longitude: number): BodyLongitudesWindow => ({
      current: longitude,
      next: longitude,
      previous: longitude,
    });
    const longitudes: Partial<Record<Body, BodyLongitudesWindow>> = {
      mars: steady(140),
      mercury: { current: 231, next: 231.1, previous: 229 },
      pluto: steady(323),
    };
    const getLongitudesWindow = ({
      body,
    }: {
      body: Body;
    }): BodyLongitudesWindow => longitudes[body] ?? steady(0);

    it("lists each pair held in an aspect across the previous, current and next minute", () => {
      const active = service.getActiveAspectBodies({
        aspects: ["conjunct", "opposite", "square"],
        bodies: ["mars", "mercury", "pluto"],
        getLongitudesWindow,
        minute,
      });

      expect(active).toStrictEqual([
        { aspect: "square", bodies: ["mars", "mercury"] },
        { aspect: "opposite", bodies: ["mars", "pluto"] },
        { aspect: "square", bodies: ["mercury", "pluto"] },
      ]);
    });

    it("samples the minute before and after the one it is given", () => {
      const sampled: string[] = [];

      service.getActiveAspectBodies({
        aspects: ["opposite"],
        bodies: ["mars"],
        getLongitudesWindow: (window) => {
          sampled.push(
            window.previousMinute.toISOString(),
            window.minute.toISOString(),
            window.nextMinute.toISOString(),
          );
          return steady(0);
        },
        minute,
      });

      expect(sampled).toStrictEqual([
        "2026-10-01T03:59:00.000Z",
        "2026-10-01T04:00:00.000Z",
        "2026-10-01T04:01:00.000Z",
      ]);
    });

    it("leaves out a pair that only enters orb at this minute", () => {
      const active = service.getActiveAspectBodies({
        aspects: ["opposite"],
        bodies: ["sun", "pluto"],
        getLongitudesWindow: ({ body }) =>
          body === "sun"
            ? { current: 135.1, next: 135.2, previous: 134.9 }
            : getLongitudesWindow({ body }),
        minute,
      });

      expect(active).toStrictEqual([]);
    });

    it("leaves out a pair that leaves orb after this minute", () => {
      const active = service.getActiveAspectBodies({
        aspects: ["opposite"],
        bodies: ["sun", "pluto"],
        getLongitudesWindow: ({ body }) =>
          body === "sun"
            ? { current: 135.1, next: 134.9, previous: 135.2 }
            : getLongitudesWindow({ body }),
        minute,
      });

      expect(active).toStrictEqual([]);
    });

    it("only considers the aspects it is given", () => {
      const active = service.getActiveAspectBodies({
        aspects: ["trine"],
        bodies: ["mars", "pluto"],
        getLongitudesWindow,
        minute,
      });

      expect(active).toStrictEqual([]);
    });
  });
});
