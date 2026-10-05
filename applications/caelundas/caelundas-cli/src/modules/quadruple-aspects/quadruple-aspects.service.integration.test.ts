import moment from "moment-timezone";
import { describe, expect, it } from "vitest";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { QuadrupleAspectsBaseService } from "./quadruple-aspects-base.service";
import { QuadrupleAspectsComposerService } from "./quadruple-aspects-composer.service";
import { QuadrupleAspectsService } from "./quadruple-aspects.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";

/**
 * Integration tests for Quadruple Aspect pattern detection
 *
 * These tests use precisely crafted aspect boundary conditions to verify
 * that Grand Cross and Kite patterns are correctly detected when they
 * form and dissolve.
 *
 * The forming/dissolving boundary is tested by including the critical aspect
 * in only current or only previous, so phase detection fires exactly once.
 */

const quadrupleAspectsBaseService = new QuadrupleAspectsBaseService(
  new AspectGraphService(),
  new AspectPhaseEmojiService(),
);
const service = new QuadrupleAspectsService(
  quadrupleAspectsBaseService,
  new QuadrupleAspectsComposerService(
    new CompoundPhaseService(),
    quadrupleAspectsBaseService,
  ),
);

describe("quadruple-aspects.events integration", () => {
  describe("grand Cross pattern detection", () => {
    it("detects forming Grand Cross when the final square completes the pattern", () => {
      const currentMinute = moment.utc("2024-06-15T14:30:00.000Z");

      // Both oppositions are new in current — keeping oppositions out of previous
      // ensures the union has each opposition exactly once, preventing duplicate
      // Grand Cross detections from the nested "for oppositions" loops.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "mars"] }, // newly added
        { aspect: "opposite", bodies: ["moon", "jupiter"] }, // newly added
        { aspect: "square", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["mars", "moon"] },
        { aspect: "square", bodies: ["mars", "jupiter"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "square", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["mars", "moon"] },
        { aspect: "square", bodies: ["mars", "jupiter"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Grand Cross");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Mars");
      expect(events[0]?.categories).toContain("Moon");
      expect(events[0]?.categories).toContain("Jupiter");
      expect(events[0]?.description).toBe(
        "Jupiter, Mars, Moon, Sun grand cross forming",
      );
      expect(events[0]?.summary).toContain("➡️");
      expect(events[0]?.summary).toContain("➕");
      expect(events[0]?.start).toStrictEqual(currentMinute);
    });

    it("detects dissolving Grand Cross when a required square ends", () => {
      const currentMinute = moment.utc("2024-06-15T18:00:00.000Z");

      // Both oppositions ended in current — keeping oppositions out of current
      // ensures the union has each opposition exactly once, preventing duplicate
      // Grand Cross detections from the nested "for oppositions" loops.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "square", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["mars", "moon"] },
        { aspect: "square", bodies: ["mars", "jupiter"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "mars"] }, // about to end
        { aspect: "opposite", bodies: ["moon", "jupiter"] }, // about to end
        { aspect: "square", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["mars", "moon"] },
        { aspect: "square", bodies: ["mars", "jupiter"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Grand Cross");
      expect(events[0]?.categories).toContain("Dissolving");
      expect(events[0]?.description).toBe(
        "Jupiter, Mars, Moon, Sun grand cross dissolving",
      );
      expect(events[0]?.summary).toContain("⬅️");
      expect(events[0]?.start).toStrictEqual(
        currentMinute.clone().subtract(1, "minute"),
      );
    });

    it("produces a progressive Grand Cross event spanning from forming to dissolving", () => {
      const formingStart = moment.utc("2024-06-15T14:30:00.000Z");
      const dissolvingStart = moment.utc("2024-06-15T18:00:00.000Z");

      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Quadruple Aspect",
          "Grand Cross",
          "Forming",
          "Sun",
          "Mars",
          "Moon",
          "Jupiter",
        ],
        description: "Jupiter, Mars, Moon, Sun grand cross forming",
        end: formingStart,
        start: formingStart,
        summary:
          "➡️ ➕ ☀️-♂️-🌙-♃ Jupiter, Mars, Moon, Sun grand cross forming",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Quadruple Aspect",
          "Grand Cross",
          "Dissolving",
          "Sun",
          "Mars",
          "Moon",
          "Jupiter",
        ],
        description: "Jupiter, Mars, Moon, Sun grand cross dissolving",
        end: dissolvingStart,
        start: dissolvingStart,
        summary:
          "⬅️ ➕ ☀️-♂️-🌙-♃ Jupiter, Mars, Moon, Sun grand cross dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.start).toStrictEqual(formingStart);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolvingStart);
      expect(progressiveEvents[0]?.categories).toContain("Quadruple Aspect");
      expect(progressiveEvents[0]?.categories).toContain("Grand Cross");
      expect(progressiveEvents[0]?.categories).toContain("Jupiter");
      expect(progressiveEvents[0]?.categories).toContain("Mars");
      expect(progressiveEvents[0]?.categories).toContain("Moon");
      expect(progressiveEvents[0]?.categories).toContain("Sun");
      expect(progressiveEvents[0]?.categories).not.toContain("Forming");
      expect(progressiveEvents[0]?.categories).not.toContain("Dissolving");
      expect(progressiveEvents[0]?.description).toBe(
        "Jupiter, Mars, Moon, Sun grand cross",
      );
      expect(progressiveEvents[0]?.summary).toContain("➕");
      expect(progressiveEvents[0]?.summary).not.toMatch(/^➡️/);
    });
  });

  describe("kite pattern detection", () => {
    it("detects forming Kite when the opposition to the focal body completes the pattern", () => {
      const currentMinute = moment.utc("2024-07-20T10:00:00.000Z");

      // Grand Trine + Kite aspects all new in current. Keeping trines out of
      // previous ensures C(trines,3)=1 grand trine combination in the union,
      // preventing duplicate Kite detections.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] }, // newly added
        { aspect: "trine", bodies: ["sun", "mars"] }, // newly added
        { aspect: "trine", bodies: ["moon", "mars"] }, // newly added
        { aspect: "opposite", bodies: ["sun", "venus"] }, // newly added
        { aspect: "sextile", bodies: ["venus", "moon"] },
        { aspect: "sextile", bodies: ["venus", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["venus", "moon"] },
        { aspect: "sextile", bodies: ["venus", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Kite");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Moon");
      expect(events[0]?.categories).toContain("Mars");
      expect(events[0]?.categories).toContain("Venus");
      expect(events[0]?.categories).toContain("Venus Focal");
      expect(events[0]?.description).toBe(
        "Mars, Moon, Sun, Venus kite forming (Venus focal)",
      );
      expect(events[0]?.summary).toContain("➡️");
      expect(events[0]?.summary).toContain("🪁");
      expect(events[0]?.start).toStrictEqual(currentMinute);
    });

    it("detects dissolving Kite when the focal opposition ends", () => {
      const currentMinute = moment.utc("2024-07-20T14:00:00.000Z");

      // Grand Trine + opposition ended in current. Keeping trines out of current
      // ensures C(trines,3)=1 grand trine combination in the union, preventing
      // duplicate Kite detections.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["venus", "moon"] },
        { aspect: "sextile", bodies: ["venus", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] }, // about to end
        { aspect: "trine", bodies: ["sun", "mars"] }, // about to end
        { aspect: "trine", bodies: ["moon", "mars"] }, // about to end
        { aspect: "opposite", bodies: ["sun", "venus"] }, // about to end
        { aspect: "sextile", bodies: ["venus", "moon"] },
        { aspect: "sextile", bodies: ["venus", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Kite");
      expect(events[0]?.categories).toContain("Dissolving");
      expect(events[0]?.categories).toContain("Venus Focal");
      expect(events[0]?.description).toBe(
        "Mars, Moon, Sun, Venus kite dissolving (Venus focal)",
      );
      expect(events[0]?.summary).toContain("⬅️");
      expect(events[0]?.start).toStrictEqual(
        currentMinute.clone().subtract(1, "minute"),
      );
    });

    it("produces a progressive Kite event spanning from forming to dissolving", () => {
      const formingStart = moment.utc("2024-07-20T10:00:00.000Z");
      const dissolvingStart = moment.utc("2024-07-20T14:00:00.000Z");

      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Quadruple Aspect",
          "Kite",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Venus",
          "Venus Focal",
        ],
        description: "Mars, Moon, Sun, Venus kite forming (Venus focal)",
        end: formingStart,
        start: formingStart,
        summary:
          "➡️ 🪁 ☀️-🌙-♂️-♀️ Mars, Moon, Sun, Venus kite forming (Venus focal)",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Quadruple Aspect",
          "Kite",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Venus",
          "Venus Focal",
        ],
        description: "Mars, Moon, Sun, Venus kite dissolving (Venus focal)",
        end: dissolvingStart,
        start: dissolvingStart,
        summary:
          "⬅️ 🪁 ☀️-🌙-♂️-♀️ Mars, Moon, Sun, Venus kite dissolving (Venus focal)",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.start).toStrictEqual(formingStart);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolvingStart);
      expect(progressiveEvents[0]?.categories).toContain("Quadruple Aspect");
      expect(progressiveEvents[0]?.categories).toContain("Kite");
      expect(progressiveEvents[0]?.categories).toContain("Venus");
      expect(progressiveEvents[0]?.categories).toContain("Venus Focal");
      expect(progressiveEvents[0]?.categories).not.toContain("Forming");
      expect(progressiveEvents[0]?.categories).not.toContain("Dissolving");
      expect(progressiveEvents[0]?.description).toBe(
        "Mars, Moon, Sun, Venus kite",
      );
      expect(progressiveEvents[0]?.summary).toContain("🪁");
      expect(progressiveEvents[0]?.summary).not.toMatch(/^➡️/);
    });
  });

  describe("edge case scenarios", () => {
    it("does not detect Grand Cross with only 1 opposition (incomplete pattern)", () => {
      const currentMinute = moment.utc("2024-09-01T08:00:00.000Z");

      // Only one opposition — need 2 for a Grand Cross
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["sun", "moon"] },
        { aspect: "square", bodies: ["sun", "jupiter"] },
        { aspect: "square", bodies: ["mars", "moon"] },
        { aspect: "square", bodies: ["mars", "jupiter"] },
      ];
      const previousAspectBodies: AspectBodies[] = [];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      const grandCrossEvents = events.filter((e) =>
        e.categories.includes("Grand Cross"),
      );

      expect(grandCrossEvents).toHaveLength(0);
    });

    it("does not detect Kite without a Grand Trine base", () => {
      const currentMinute = moment.utc("2024-09-01T10:00:00.000Z");

      // Kite-specific aspects but no Grand Trine (no trines at all)
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "venus"] },
        { aspect: "sextile", bodies: ["venus", "moon"] },
        { aspect: "sextile", bodies: ["venus", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      const kiteEvents = events.filter((e) => e.categories.includes("Kite"));

      expect(kiteEvents).toHaveLength(0);
    });

    it("does not detect Grand Cross when squares are replaced with trines", () => {
      const currentMinute = moment.utc("2024-09-01T12:00:00.000Z");

      // Two oppositions but connections are trines, not squares
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "mars"] },
        { aspect: "opposite", bodies: ["moon", "jupiter"] },
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "moon"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "mars"] },
        { aspect: "opposite", bodies: ["moon", "jupiter"] },
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "moon"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      const grandCrossEvents = events.filter((e) =>
        e.categories.includes("Grand Cross"),
      );

      expect(grandCrossEvents).toHaveLength(0);
    });
  });
});
