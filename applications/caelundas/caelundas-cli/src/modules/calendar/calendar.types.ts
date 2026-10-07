// 🏷️ Types
import type { DetectedCalendarEvent } from "../caelundas-database/caelundas-database.types";
import type { LogData } from "@codebase/logging";
import type { Moment } from "moment-timezone";

/**
 * Parameters for generating a complete iCalendar file.
 */
export interface BuildCalendarFileContentParameters {
  /** Calendar description (optional). */
  description: string;

  /** Array of events to include in the calendar. */
  events: DetectedCalendarEvent[];

  /**
   * Calendar name displayed in calendar applications.
   * @example "Caelundas Astronomical Calendar"
   */
  name: string;

  /**
   * IANA timezone identifier for event times (optional).
   * @remarks Defaults to "America/New_York". Must match timezone used for ephemeris calculations.
   */
  timezone: string;
}

/**
 * Arguments used to build and log an instantaneous event.
 */
export interface BuildInstantEventArguments {
  categories: string[];
  date: Moment;
  description: string;
  logger: {
    info: (message: string, context?: string, data?: LogData) => void;
  };
  summary: string;
  timezone: string;
}
