import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logging";

import { AspectGraphService } from "../src/modules/aspects/aspect-graph.service";
import { ProgressiveCompoundEventService } from "../src/modules/aspects/progressive-compound-event.service";
import { ProgressiveUtilitiesService } from "../src/modules/progressive/progressive-utilities.service";
import { StelliumService } from "../src/modules/stellium/stellium.service";

import type { AspectBodies } from "../src/modules/aspects/aspects.types";
import type { Body } from "../src/modules/caelundas/caelundas.types";

/**
 * Stelliums as maximal cliques of the conjunction graph, and the
 * dissolve/form pairs a membership change produces.
 */
describe("stelliumService maximal conjunction cliques", () => {
  let service: StelliumService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AspectGraphService,
        LoggerService,
        ProgressiveCompoundEventService,
        ProgressiveUtilitiesService,
        StelliumService,
      ],
    }).compile();
    service = await module.resolve(StelliumService);
  });

  describe("detect", () => {
    /** Every pair of `members` as a conjunction. */
    function clique(...members: Body[]): AspectBodies[] {
      return members.flatMap((first, index) =>
        members.slice(index + 1).map((second): AspectBodies => ({
          aspect: "conjunct",
          bodies: [first, second],
        })),
      );
    }

    /** Descriptions of the stelliums detected at one minute, in order. */
    function describeDetected(
      previousAspectBodies: AspectBodies[],
      currentAspectBodies: AspectBodies[],
    ): string[] {
      return service
        .detect({
          currentAspectBodies,
          minute: moment.utc("2026-01-15T07:48:00.000Z"),
          previousAspectBodies,
        })
        .map((event) => event.description)
        .toSorted();
    }

    it("reports a stellium inside a conjunction component that is not a clique", () => {
      // 15 January 2026: Mars, Mercury, Sun and Venus are one stellium, and
      // Vesta and Pluto are conjunct with only some of it. The Sun-Pluto leg
      // closes a second stellium inside the same component.
      const before = [
        ...clique("mars", "mercury", "sun", "venus"),
        ...clique("pluto", "venus", "vesta"),
        { aspect: "conjunct", bodies: ["sun", "vesta"] },
      ] satisfies AspectBodies[];
      const after = [
        ...before,
        { aspect: "conjunct", bodies: ["sun", "pluto"] },
      ] satisfies AspectBodies[];

      expect(describeDetected(before, after)).toStrictEqual([
        "Pluto, Sun, Venus, Vesta stellium forming",
      ]);
    });

    it("reports overlapping stelliums that share bodies", () => {
      // 19 December 2025: Mars is conjunct with Juno, the Moon and the Sun
      // but not Venus, so the Moon-Mars leg forms a second stellium beside
      // Juno, Moon, Sun, Venus without disturbing it.
      const before = [
        ...clique("juno", "moon", "sun", "venus"),
        ...clique("juno", "mars", "sun"),
      ];
      const after = [
        ...before,
        { aspect: "conjunct", bodies: ["moon", "mars"] },
      ] satisfies AspectBodies[];

      expect(describeDetected(before, after)).toStrictEqual([
        "Juno, Mars, Moon, Sun stellium forming",
      ]);
    });

    it("reports no stellium that lies inside a larger one", () => {
      expect(
        describeDetected(
          [],
          clique("mars", "mercury", "sun", "venus", "vesta"),
        ),
      ).toStrictEqual(["Mars, Mercury, Sun, Venus, Vesta stellium forming"]);
    });

    it("dissolves a stellium and forms the larger one when a body joins", () => {
      // 17 January 2026, 19:50 UT: the Mercury-Pluto leg turns two 5-body
      // stelliums into one 6-body stellium.
      const before = [
        ...clique("mars", "mercury", "sun", "venus", "vesta"),
        ...clique("mars", "pluto", "sun", "venus", "vesta"),
      ];
      const after = [
        ...before,
        { aspect: "conjunct", bodies: ["mercury", "pluto"] },
      ] satisfies AspectBodies[];

      expect(describeDetected(before, after)).toStrictEqual([
        "Mars, Mercury, Pluto, Sun, Venus, Vesta stellium forming",
        "Mars, Mercury, Sun, Venus, Vesta stellium dissolving",
        "Mars, Pluto, Sun, Venus, Vesta stellium dissolving",
      ]);
    });

    it("dissolves a stellium and forms the smaller one when a body leaves", () => {
      const before = clique("moon", "pluto", "sun", "venus", "vesta");
      const after = before.filter(
        (edge) =>
          !(edge.bodies.includes("moon") && edge.bodies.includes("sun")),
      );

      expect(describeDetected(before, after)).toStrictEqual([
        "Moon, Pluto, Sun, Venus, Vesta stellium dissolving",
        "Moon, Pluto, Venus, Vesta stellium forming",
        "Pluto, Sun, Venus, Vesta stellium forming",
      ]);
    });

    it("reports a stellium once when its legs are in both snapshots twice", () => {
      const legs = clique("mars", "mercury", "sun", "venus");
      const reversed = legs.map((edge): AspectBodies => ({
        aspect: edge.aspect,
        bodies: [edge.bodies[1], edge.bodies[0]],
      }));

      expect(
        describeDetected(legs.slice(1), [...legs, ...reversed]),
      ).toStrictEqual(["Mars, Mercury, Sun, Venus stellium forming"]);
    });
  });
});
