import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
// 🏷️ Types
import type { PipelineWindowRequest } from "./pipeline-window.types";

/** How one reference event compared with the nearest detected one. */
export interface ReferenceComparison {
  /** The detected event nearest the reference start, if any shares its summary. */
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
export interface ReferenceEvent {
  /** When the span ends, as a UTC instant. Omit for an instantaneous event. */
  end?: string | undefined;
  /** Free text kept for the auditor, such as the authority's local time. */
  note?: string | undefined;
  /** When the event starts, as a UTC instant. */
  start: string;
  /** The event's exact `summary`, emoji included. */
  summary: string;
  /** Overrides the fixture's tolerance for this event alone. */
  toleranceMinutes?: number | undefined;
}

/** A small committed file of authoritative values for one window. */
export interface ReferenceFixture {
  /** Summaries that must not appear anywhere in the window. */
  absent?: string[] | undefined;
  events: ReferenceEvent[];
  /** What the fixture covers and why, in a sentence. */
  name: string;
  /** The day the values were read from the source, `YYYY-MM-DD`. */
  retrieved: string;
  /** Who published the values, and where to read them again. */
  source: { name: string; url: string };
  /** How far an event may drift from its reference, in minutes. */
  toleranceMinutes: number;
  /** The place and dates to sweep. */
  window: PipelineWindowRequest;
}
