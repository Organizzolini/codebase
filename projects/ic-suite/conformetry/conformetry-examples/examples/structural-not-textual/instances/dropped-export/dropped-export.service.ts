// 🎯 Service

/** Builds a dropped-export report. */
export class DroppedExportService {
  // 🌎 Public Methods

  /** Renders every row as one document. */
  public render(rows: string[]): string {
    const joined = rows.join("\n");

    return joined;
  }
}
