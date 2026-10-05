import moment from "moment-timezone";
import { describe, expect, it } from "vitest";

import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { ProgressiveCompoundEventService } from "../aspects/progressive-compound-event.service";
import { MathService } from "../math/math.service";

import { SextupleAspectsComposerService } from "./sextuple-aspects-composer.service";
import { SextupleAspectsService } from "./sextuple-aspects.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Event } from "../calendar/calendar.types";

/**
 * Integration tests for Sextuple Aspects (Hexagram/Star of David) detection
 *
 * These tests use carefully crafted astronomical configurations to trigger
 * the extremely rare hexagram pattern (6 bodies forming two interlocking grand trines).
 *
 * Hexagram requirements:
 * - 6 trines connecting bodies 0-2, 0-4, 2-4 (first triangle)
 * - 3 more trines connecting 1-3, 1-5, 3-5 (second triangle)
 * - 6 sextiles connecting adjacent bodies: 0-1, 1-2, 2-3, 3-4, 4-5, 5-0
 */

const service = new SextupleAspectsService(
  new SextupleAspectsComposerService(
    new AspectPhaseEmojiService(),
    new ProgressiveCompoundEventService(),
  ),
  new MathService(),
  new CompoundPhaseService(),
);

describe("sextuple-aspects.events integration", () => {
  describe("hexagram pattern detection", () => {
    it("detects forming Hexagram when pattern first appears", () => {
      const currentMinute = moment.utc("2024-09-22T18:42:00.000Z");

      // Previous minute (18:41): Pattern does NOT exist yet
      // Current minute (18:42): Pattern EXISTS (forming)
      // Next minute (18:43): Pattern EXISTS (continues)

      // Sun trine Mars starts at currentMinute (forming trigger) -> currentAspectBodies only
      // All other 11 aspects span across currentMinute -> both edges
      const currentAspectBodies: AspectBodies[] = [
        // First grand trine: Sun(0) - Mars(2) - Jupiter(4)
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        // Second grand trine: Moon(1) - Venus(3) - Saturn(5)
        { aspect: "trine", bodies: ["moon", "venus"] },
        { aspect: "trine", bodies: ["moon", "saturn"] },
        { aspect: "trine", bodies: ["venus", "saturn"] },
        // Sextiles connecting adjacent bodies (hexagon perimeter)
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "sextile", bodies: ["moon", "mars"] },
        { aspect: "sextile", bodies: ["mars", "venus"] },
        { aspect: "sextile", bodies: ["venus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "saturn"] },
        { aspect: "sextile", bodies: ["saturn", "sun"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        // All except Sun trine Mars (which starts at currentMinute)
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        { aspect: "trine", bodies: ["moon", "venus"] },
        { aspect: "trine", bodies: ["moon", "saturn"] },
        { aspect: "trine", bodies: ["venus", "saturn"] },
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "sextile", bodies: ["moon", "mars"] },
        { aspect: "sextile", bodies: ["mars", "venus"] },
        { aspect: "sextile", bodies: ["venus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "saturn"] },
        { aspect: "sextile", bodies: ["saturn", "sun"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toBeDefined();
      expect(events[0]?.categories).toContain("Hexagram");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Jupiter");
      expect(events[0]?.categories).toContain("Mars");
      expect(events[0]?.categories).toContain("Moon");
      expect(events[0]?.categories).toContain("Saturn");
      expect(events[0]?.categories).toContain("Sun");
      expect(events[0]?.categories).toContain("Venus");
      expect(events[0]?.description).toContain("hexagram forming");
      expect(events[0]?.summary).toContain("➡️"); // Forming emoji
      expect(events[0]?.summary).toContain("🔯"); // Hexagram symbol
    });

    it("detects dissolving Hexagram when pattern breaks apart", () => {
      const currentMinute = moment.utc("2024-09-22T19:00:00.000Z");

      // Previous minute (18:59): Pattern EXISTS
      // Current minute (19:00): Pattern EXISTS but will end (dissolving)
      // Next minute (19:01): Pattern does NOT exist

      // Sun trine Mars ends at currentMinute (dissolving trigger) -> previousAspectBodies only
      // All other 11 aspects span across currentMinute -> both edges
      const currentAspectBodies: AspectBodies[] = [
        // All except Sun trine Mars (which ends at currentMinute)
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        { aspect: "trine", bodies: ["moon", "venus"] },
        { aspect: "trine", bodies: ["moon", "saturn"] },
        { aspect: "trine", bodies: ["venus", "saturn"] },
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "sextile", bodies: ["moon", "mars"] },
        { aspect: "sextile", bodies: ["mars", "venus"] },
        { aspect: "sextile", bodies: ["venus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "saturn"] },
        { aspect: "sextile", bodies: ["saturn", "sun"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        // First grand trine: Sun(0) - Mars(2) - Jupiter(4)
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        // Second grand trine: Moon(1) - Venus(3) - Saturn(5)
        { aspect: "trine", bodies: ["moon", "venus"] },
        { aspect: "trine", bodies: ["moon", "saturn"] },
        { aspect: "trine", bodies: ["venus", "saturn"] },
        // Sextiles connecting adjacent bodies (hexagon perimeter)
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "sextile", bodies: ["moon", "mars"] },
        { aspect: "sextile", bodies: ["mars", "venus"] },
        { aspect: "sextile", bodies: ["venus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "saturn"] },
        { aspect: "sextile", bodies: ["saturn", "sun"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toBeDefined();
      expect(events[0]?.categories).toContain("Hexagram");
      expect(events[0]?.categories).toContain("Dissolving");
      expect(events[0]?.description).toContain("hexagram dissolving");
      expect(events[0]?.summary).toContain("⬅️"); // Dissolving emoji
    });

    it("creates progressive event from forming/dissolving Hexagram pair", () => {
      const formingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Sextuple Aspect",
          "Hexagram",
          "Forming",
          "Jupiter",
          "Mars",
          "Moon",
          "Saturn",
          "Sun",
          "Venus",
        ],
        description: "Jupiter, Mars, Moon, Saturn, Sun, Venus hexagram forming",
        end: moment.utc("2024-09-22T18:42:00.000Z"),
        start: moment.utc("2024-09-22T18:42:00.000Z"),
        summary:
          "➡️ ✡ ☉-☽-♂-♃-♀-♄ Jupiter, Mars, Moon, Saturn, Sun, Venus hexagram forming",
      };

      const dissolvingEvent: Event = {
        categories: [
          "Astronomy",
          "Astrology",
          "Compound Aspect",
          "Sextuple Aspect",
          "Hexagram",
          "Dissolving",
          "Jupiter",
          "Mars",
          "Moon",
          "Saturn",
          "Sun",
          "Venus",
        ],
        description:
          "Jupiter, Mars, Moon, Saturn, Sun, Venus hexagram dissolving",
        end: moment.utc("2024-09-22T19:00:00.000Z"),
        start: moment.utc("2024-09-22T19:00:00.000Z"),
        summary:
          "⬅️ ✡ ☉-☽-♂-♃-♀-♄ Jupiter, Mars, Moon, Saturn, Sun, Venus hexagram dissolving",
      };

      const progressiveEvents = service.detectProgressive([
        formingEvent,
        dissolvingEvent,
      ]);

      expect(progressiveEvents).toHaveLength(1);
      expect(progressiveEvents[0]).toBeDefined();
      expect(progressiveEvents[0]?.start).toStrictEqual(
        moment.utc("2024-09-22T18:42:00.000Z"),
      );
      expect(progressiveEvents[0]?.end).toStrictEqual(
        moment.utc("2024-09-22T19:00:00.000Z"),
      );
      expect(progressiveEvents[0]?.categories).toContain("Sextuple Aspect");
      expect(progressiveEvents[0]?.categories).toContain("Hexagram");
      expect(progressiveEvents[0]?.categories).not.toContain("Forming");
      expect(progressiveEvents[0]?.categories).not.toContain("Dissolving");
      expect(progressiveEvents[0]?.description).toContain("hexagram");
      expect(progressiveEvents[0]?.description).not.toMatch(
        /(forming|dissolving)$/i,
      );
    });
  });

  describe("hexagram body combination scenarios", () => {
    it("detects Hexagram with outer planets", () => {
      const currentMinute = moment.utc("2024-12-05T11:30:00.000Z");

      // Mars trine Jupiter starts at currentMinute (forming trigger) -> currentAspectBodies only
      // All other 11 aspects span across currentMinute -> both edges
      const currentAspectBodies: AspectBodies[] = [
        // First grand trine: Mars-Jupiter-Saturn
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "saturn"] },
        { aspect: "trine", bodies: ["jupiter", "saturn"] },
        // Second grand trine: Uranus-Neptune-Pluto
        { aspect: "trine", bodies: ["uranus", "neptune"] },
        { aspect: "trine", bodies: ["uranus", "pluto"] },
        { aspect: "trine", bodies: ["neptune", "pluto"] },
        // Sextiles
        { aspect: "sextile", bodies: ["mars", "uranus"] },
        { aspect: "sextile", bodies: ["uranus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "neptune"] },
        { aspect: "sextile", bodies: ["neptune", "saturn"] },
        { aspect: "sextile", bodies: ["saturn", "pluto"] },
        { aspect: "sextile", bodies: ["pluto", "mars"] },
      ];
      const previousAspectBodies: AspectBodies[] = [
        // All except Mars trine Jupiter (which starts at currentMinute)
        { aspect: "trine", bodies: ["mars", "saturn"] },
        { aspect: "trine", bodies: ["jupiter", "saturn"] },
        { aspect: "trine", bodies: ["uranus", "neptune"] },
        { aspect: "trine", bodies: ["uranus", "pluto"] },
        { aspect: "trine", bodies: ["neptune", "pluto"] },
        { aspect: "sextile", bodies: ["mars", "uranus"] },
        { aspect: "sextile", bodies: ["uranus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "neptune"] },
        { aspect: "sextile", bodies: ["neptune", "saturn"] },
        { aspect: "sextile", bodies: ["saturn", "pluto"] },
        { aspect: "sextile", bodies: ["pluto", "mars"] },
      ];

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toBeDefined();
      expect(events[0]?.categories).toContain("Hexagram");
      expect(events[0]?.categories).toContain("Forming");
      expect(events[0]?.categories).toContain("Mars");
      expect(events[0]?.categories).toContain("Jupiter");
      expect(events[0]?.categories).toContain("Saturn");
      expect(events[0]?.categories).toContain("Uranus");
      expect(events[0]?.categories).toContain("Neptune");
      expect(events[0]?.categories).toContain("Pluto");
    });
  });

  describe("edge case scenarios", () => {
    it("does not detect Hexagram with incomplete first grand trine", () => {
      const currentMinute = moment.utc("2024-09-22T18:42:00.000Z");

      // First grand trine INCOMPLETE: missing Jupiter-Mars trine
      const edges: AspectBodies[] = [
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        // Missing: Mars trine Jupiter
        // Second grand trine complete
        { aspect: "trine", bodies: ["moon", "venus"] },
        { aspect: "trine", bodies: ["moon", "saturn"] },
        { aspect: "trine", bodies: ["venus", "saturn"] },
        // All sextiles present
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "sextile", bodies: ["moon", "mars"] },
        { aspect: "sextile", bodies: ["mars", "venus"] },
        { aspect: "sextile", bodies: ["venus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "saturn"] },
        { aspect: "sextile", bodies: ["saturn", "sun"] },
      ];
      const currentAspectBodies = edges;
      const previousAspectBodies = edges;

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(0);
    });

    it("does not detect Hexagram with incomplete sextile ring", () => {
      const currentMinute = moment.utc("2024-09-22T18:42:00.000Z");

      // Both grand trines complete, but sextile ring incomplete
      const edges: AspectBodies[] = [
        // Both grand trines complete
        { aspect: "trine", bodies: ["sun", "mars"] },
        { aspect: "trine", bodies: ["sun", "jupiter"] },
        { aspect: "trine", bodies: ["mars", "jupiter"] },
        { aspect: "trine", bodies: ["moon", "venus"] },
        { aspect: "trine", bodies: ["moon", "saturn"] },
        { aspect: "trine", bodies: ["venus", "saturn"] },
        // Sextiles INCOMPLETE: missing Saturn-Sun sextile
        { aspect: "sextile", bodies: ["sun", "moon"] },
        { aspect: "sextile", bodies: ["moon", "mars"] },
        { aspect: "sextile", bodies: ["mars", "venus"] },
        { aspect: "sextile", bodies: ["venus", "jupiter"] },
        { aspect: "sextile", bodies: ["jupiter", "saturn"] },
        // Missing: Saturn sextile Sun
      ];
      const currentAspectBodies = edges;
      const previousAspectBodies = edges;

      const events = service.detect({
        currentAspectBodies,
        minute: currentMinute,
        previousAspectBodies,
      });

      expect(events).toHaveLength(0);
    });
  });
});
