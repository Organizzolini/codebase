// 🏷️ Types

/** Arguments accepted when rendering a report as JSON. */
export interface RenderReportArguments<Report> {
  indentation: number;
  report: Report;
}

/** Arguments accepted when syncing a JSON file with a report. */
export interface SyncJsonArguments<Report> {
  check: boolean;
  indentation: number;
  path: string;
  report: Report;
}
