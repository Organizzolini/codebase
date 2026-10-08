// 🎯 Service

/** Builds a reformatted report. */
export class ReformattedService {
  // 🌎 Public Methods

  /** Renders every row as one document. */
  public render(rows: string[]): string {
    // Reformatted against the template on purpose: no blank line before the
    // return, and an inline comment the template never had. Neither is a
    // finding, because the comparison is a syntax tree.
    const joined = rows.join("\n");
    return joined;
  }

  /** Counts the rows. A method the template never asked for. */
  public count(rows: string[]): number {
    return rows.length;
  }
}

/** Title the report carries when nobody sets one. */
export const reformattedTitle = "reformatted";
