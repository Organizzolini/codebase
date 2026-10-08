import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
// 🏷️ Types
import type { referenceFixtureSchema } from "./reference-fixtures.constants";
import type { z } from "zod";

/** How one reference event compared with the detected event paired to it. */
export interface ReferenceComparison {
  /** The detected event paired with this reference, if any shares its summary. */
  actual?: DetectedCalendarEvent;
  /** Minutes from the reference to the detected end, for a span. */
  endDeltaMinutes?: number;
  expected: ReferenceEvent;
  passed: boolean;
  /** Minutes from the reference to the detected start. Positive means late. */
  startDeltaMinutes?: number;
  toleranceMinutes: number;
}

/** One event an authority says must appear in the swept window. */
export type ReferenceEvent = ReferenceFixture["events"][number];

/**
 * A small committed file of authoritative values for one window, as the
 * schema in `reference-fixtures.constants.ts` validates it. Optional fields:
 * `absent` (summaries that must not appear in the window), `counts` (summary
 * to the exact number of events with it in the window), and per event `end`,
 * `note` and `toleranceMinutes`.
 */
export type ReferenceFixture = z.infer<typeof referenceFixtureSchema>;
