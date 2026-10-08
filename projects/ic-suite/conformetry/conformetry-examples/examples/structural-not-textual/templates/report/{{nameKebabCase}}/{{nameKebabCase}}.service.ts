// 🎯 Service

/** Builds a {{nameKebabCase}} report. */
export class {{namePascalCase}}Service {
  // 🌎 Public Methods

  /** Renders every row as one document. */
  public render(rows: string[]): string {
    const joined = rows.join("\n");

    return joined;
  }
}

/** Title the report carries when nobody sets one. */
export const {{nameCamelCase}}Title = "{{nameKebabCase}}";
