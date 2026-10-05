// 🏷️ Types

/** The two files one run of the command writes, read back. */
export interface CalendarCommandOutput {
  ics: string;
  json: { summary: string }[];
}

/** A place and date range one run of the command is asked for. */
export interface CalendarCommandRun {
  /** Exclusive end date, `YYYY-MM-DD`. */
  endDate: string;
  latitude: number;
  longitude: number;
  outputDirectory: string;
  /** Inclusive start date, `YYYY-MM-DD`. */
  startDate: string;
}
