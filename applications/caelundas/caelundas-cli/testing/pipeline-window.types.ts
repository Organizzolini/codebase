// 🏷️ Types
import type { DetectedCalendarEvent } from "../src/modules/caelundas-database/caelundas-database.types";
import type { Input } from "../src/modules/input/input.types";

/** What one sweep of the pipeline detected. */
export interface PipelineWindow {
  /** Perfective then progressive events, sorted by start time. */
  events: DetectedCalendarEvent[];
  /** The validated input the sweep ran with, including the derived timezone. */
  input: Input;
  /** Instantaneous events from the minute-by-minute pass. */
  perfective: DetectedCalendarEvent[];
  /** Span events the progressive pass built from the perfective ones. */
  progressive: DetectedCalendarEvent[];
}

/**
 * A place and a short date range to sweep through the real pipeline.
 * Keep it to one to three days: a sweep costs about nine seconds a day.
 */
export interface PipelineWindowRequest {
  /** Last date swept, `YYYY-MM-DD`, in the observer's timezone. */
  endDate: string;
  latitude: number;
  longitude: number;
  /** First date swept, `YYYY-MM-DD`, in the observer's timezone. */
  startDate: string;
}
