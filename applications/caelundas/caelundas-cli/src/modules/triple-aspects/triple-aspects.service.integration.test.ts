import moment from "moment-timezone";
import { describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { TripleAspectsComposerService } from "./triple-aspects-composer.service";
import { TripleAspectsDetectorService } from "./triple-aspects-detector.service";
import { TripleAspectsService } from "./triple-aspects.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";

/**
 * Integration tests for Triple Aspect pattern detection
 *
 * These tests use precisely crafted aspect boundary conditions to verify
 * that T-Square, Yod, and Grand Trine patterns are correctly detected when
 * they form and dissolve.
 *
 * The forming/dissolving boundary is tested by including the critical aspect
 * in only current or only previous, so phase detection fires exactly once.
 */

const aspectGraphService = new AspectGraphService();
const composerService = new TripleAspectsComposerService(
  aspectGraphService,
  new AspectPhaseEmojiService(),
  new LoggerService(),
);
const detectorService = new TripleAspectsDetectorService(
  aspectGraphService,
  new CompoundPhaseService(),
  composerService,
);
const service = new TripleAspectsService(composerService, detectorService);

describe("triple-aspects.events integration", () => {
  describe("t-Square pattern detection", () => {
    it("detects forming T-Square when the final aspect completes the pattern", () => {
      const currentMinute = moment.utc("2024-06-15T14:30:00.000Z");

      // Opposition is new in current — it's the unique edge in the union, preventing
      // duplicate T-Square detections from the outer "for oppositions" loop.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] }, // newly added
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("T Square");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Moon");
      expect(events[0]?.categories).toContain("Mars");
      expect(events[0]?.categories).toContain("Mars Focal");
      expect(events[0]?.description).toBe(
        "Mars, Moon, Sun t-square forming (Mars focal)",
      );
      expect(events[0]?.summary).toContain("➡️");
      expect(events[0]?.summary).toContain("⊤");
      expect(events[0]?.start).toStrictEqual(currentMinute);
    });

    it("detects dissolving T-Square when a required aspect ends", () => {
      const currentMinute = moment.utc("2024-06-15T16:00:00.000Z");

      // Opposition ended in current — it's the unique edge in the union, preventing
      // duplicate T-Square detections from the outer "for oppositions" loop.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] }, // about to end
        { aspect: "square", bodies: ["sun", "mars"] },
        { aspect: "square", bodies: ["moon", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("T Square");
      expect(events[0]?.categories).toContain("Dissolving");
      expect(events[0]?.categories).toContain("Mars Focal");
      expect(events[0]?.description).toBe(
        "Mars, Moon, Sun t-square dissolving (Mars focal)",
      );
      expect(events[0]?.summary).toContain("⬅️");
      expect(events[0]?.start).toStrictEqual(
        currentMinute.clone().subtract(1, "minute"),
      );
    });

    it("produces a progressive T-Square event spanning from forming to dissolving", () => {
      const formingStart = moment.utc("2024-06-15T14:30:00.000Z");
      const dissolvingStart = moment.utc("2024-06-15T16:00:00.000Z");

      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "T Square",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
          "Mars Focal",
        ],
        description: "Mars, Moon, Sun t-square forming (Mars focal)",
        end: formingStart,
        start: formingStart,
        summary: "➡️ ⊤ ☀️-🌙-♂️ Mars, Moon, Sun t-square forming (Mars focal)",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "T Square",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
          "Mars Focal",
        ],
        description: "Mars, Moon, Sun t-square dissolving (Mars focal)",
        end: dissolvingStart,
        start: dissolvingStart,
        summary:
          "⬅️ ⊤ ☀️-🌙-♂️ Mars, Moon, Sun t-square dissolving (Mars focal)",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.start).toStrictEqual(formingStart);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolvingStart);
      expect(progressiveEvents[0]?.categories).toContain("Triple Aspect");
      expect(progressiveEvents[0]?.categories).toContain("T Square");
      expect(progressiveEvents[0]?.categories).toContain("Mars");
      expect(progressiveEvents[0]?.categories).toContain("Moon");
      expect(progressiveEvents[0]?.categories).toContain("Sun");
      expect(progressiveEvents[0]?.categories).not.toContain("Forming");
      expect(progressiveEvents[0]?.categories).not.toContain("Dissolving");
      expect(progressiveEvents[0]?.description).toBe(
        "Mars, Moon, Sun t-square",
      );
      expect(progressiveEvents[0]?.summary).toContain("⊤");
      expect(progressiveEvents[0]?.summary).toContain("(focal: Mars)");
      expect(progressiveEvents[0]?.summary).not.toMatch(/^➡️/);
    });
  });

  describe("yod pattern detection", () => {
    it("detects forming Yod when the second quincunx completes the pattern", () => {
      const currentMinute = moment.utc("2024-07-20T10:15:00.000Z");

      // Sextile is new in current — it's the unique edge in the union, preventing
      // duplicate Yod detections from the outer "for sextiles" loop.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["venus", "jupiter"] }, // newly added
        { aspect: "quincunx", bodies: ["venus", "saturn"] },
        { aspect: "quincunx", bodies: ["jupiter", "saturn"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "quincunx", bodies: ["venus", "saturn"] },
        { aspect: "quincunx", bodies: ["jupiter", "saturn"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Yod");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Venus");
      expect(events[0]?.categories).toContain("Jupiter");
      expect(events[0]?.categories).toContain("Saturn");
      expect(events[0]?.categories).toContain("Saturn Focal");
      expect(events[0]?.description).toBe(
        "Jupiter, Saturn, Venus yod forming (Saturn focal)",
      );
      expect(events[0]?.summary).toContain("➡️");
      expect(events[0]?.summary).toContain("⚛");
      expect(events[0]?.start).toStrictEqual(currentMinute);
    });

    it("detects dissolving Yod when a required aspect ends", () => {
      const currentMinute = moment.utc("2024-07-20T14:00:00.000Z");

      // Sextile ended in current — it's the unique edge in the union, preventing
      // duplicate Yod detections from the outer "for sextiles" loop.
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "quincunx", bodies: ["venus", "saturn"] },
        { aspect: "quincunx", bodies: ["jupiter", "saturn"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["venus", "jupiter"] }, // about to end
        { aspect: "quincunx", bodies: ["venus", "saturn"] },
        { aspect: "quincunx", bodies: ["jupiter", "saturn"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Yod");
      expect(events[0]?.categories).toContain("Dissolving");
      expect(events[0]?.categories).toContain("Saturn Focal");
      expect(events[0]?.description).toBe(
        "Jupiter, Saturn, Venus yod dissolving (Saturn focal)",
      );
      expect(events[0]?.summary).toContain("⬅️");
      expect(events[0]?.start).toStrictEqual(
        currentMinute.clone().subtract(1, "minute"),
      );
    });
  });

  describe("grand Trine pattern detection", () => {
    it("detects forming Grand Trine when the third trine completes the triangle", () => {
      const currentMinute = moment.utc("2024-08-05T09:00:00.000Z");

      // Sun-Mars trine is new in current → forming boundary
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["sun", "mars"] }, // newly added
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Grand Trine");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Moon");
      expect(events[0]?.categories).toContain("Mars");
      expect(events[0]?.categories).not.toContain("Mars Focal");
      expect(events[0]?.description).toBe(
        "Mars, Moon, Sun grand trine forming",
      );
      expect(events[0]?.summary).toContain("➡️");
      expect(events[0]?.summary).toContain("△");
      expect(events[0]?.start).toStrictEqual(currentMinute);
    });

    it("detects dissolving Grand Trine when a trine aspect ends", () => {
      const currentMinute = moment.utc("2024-08-05T12:00:00.000Z");

      // Sun-Mars trine ended → dissolving boundary
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Grand Trine");
      expect(events[0]?.categories).toContain("Dissolving");
      expect(events[0]?.description).toBe(
        "Mars, Moon, Sun grand trine dissolving",
      );
      expect(events[0]?.summary).toContain("⬅️");
      expect(events[0]?.start).toStrictEqual(
        currentMinute.clone().subtract(1, "minute"),
      );
    });

    it("produces a progressive Grand Trine event spanning from forming to dissolving", () => {
      const formingStart = moment.utc("2024-08-05T09:00:00.000Z");
      const dissolvingStart = moment.utc("2024-08-05T12:00:00.000Z");

      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Grand Trine",
          "Forming",
          "Sun",
          "Moon",
          "Mars",
        ],
        description: "Mars, Moon, Sun grand trine forming",
        end: formingStart,
        start: formingStart,
        summary: "➡️ △ ☀️-🌙-♂️ Mars, Moon, Sun grand trine forming",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Triple Aspect",
          "Grand Trine",
          "Dissolving",
          "Sun",
          "Moon",
          "Mars",
        ],
        description: "Mars, Moon, Sun grand trine dissolving",
        end: dissolvingStart,
        start: dissolvingStart,
        summary: "⬅️ △ ☀️-🌙-♂️ Mars, Moon, Sun grand trine dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]?.start).toStrictEqual(formingStart);
      expect(progressiveEvents[0]?.end).toStrictEqual(dissolvingStart);
      expect(progressiveEvents[0]?.categories).toContain("Triple Aspect");
      expect(progressiveEvents[0]?.categories).toContain("Grand Trine");
      expect(progressiveEvents[0]?.categories).toContain("Mars");
      expect(progressiveEvents[0]?.categories).toContain("Moon");
      expect(progressiveEvents[0]?.categories).toContain("Sun");
      expect(progressiveEvents[0]?.categories).not.toContain("Forming");
      expect(progressiveEvents[0]?.categories).not.toContain("Dissolving");
      expect(progressiveEvents[0]?.description).toBe(
        "Mars, Moon, Sun grand trine",
      );
      expect(progressiveEvents[0]?.summary).toContain("△");
      expect(progressiveEvents[0]?.summary).not.toMatch(/^➡️/);
    });
  });

  describe("edge case scenarios", () => {
    it("does not detect Grand Trine with only 2 trines (incomplete pattern)", () => {
      const currentMinute = moment.utc("2024-09-01T08:00:00.000Z");

      const currentAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
        // Missing: sun-mars trine
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "moon"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(0);
    });

    it("does not detect Grand Trine when aspect type is wrong (sextiles instead of trines)", () => {
      const currentMinute = moment.utc("2024-09-01T10:00:00.000Z");

      const currentAspectBodies: AspectBodies[] = [
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "sextile", bodies: ["sun", "mars"] },
        { aspect: "sextile", bodies: ["moon", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      const grandTrineEvents = events.filter((e) =>
        e.categories.includes("Grand Trine"),
      );

      expect(grandTrineEvents).toHaveLength(0);
    });

    it("does not detect T-Square when using trines instead of squares", () => {
      const currentMinute = moment.utc("2024-09-01T12:00:00.000Z");

      // Opposition exists but trines instead of squares (no T-Square)
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "opposite", bodies: ["sun", "moon"] },
        { aspect: "trine", bodies: ["moon", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      const tSquareEvents = events.filter((e) =>
        e.categories.includes("T Square"),
      );

      expect(tSquareEvents).toHaveLength(0);
    });

    it("detects Grand Trine with outer planets", () => {
      const currentMinute = moment.utc("2024-10-01T06:00:00.000Z");

      // Jupiter-Saturn-Neptune grand trine (outer planets)
      const currentAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["jupiter", "saturn"] },
        { aspect: "trine", bodies: ["jupiter", "neptune"] }, // newly added
        { aspect: "trine", bodies: ["saturn", "neptune"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        { aspect: "trine", bodies: ["jupiter", "saturn"] },
        { aspect: "trine", bodies: ["saturn", "neptune"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.categories).toContain("Grand Trine");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Jupiter");
      expect(events[0]?.categories).toContain("Saturn");
      expect(events[0]?.categories).toContain("Neptune");
    });
  });
});
