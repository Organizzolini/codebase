import { describe, expect, it } from "vitest";

import {
  get{{namePascalCase}}InputSchema,
  post{{namePascalCase}}InputSchema,
} from "./{{nameKebabCase}}.constants";
import {
  find{{namePascalCase}},
  save{{namePascalCase}},
} from "./{{nameKebabCase}}.utilities";

describe("{{nameKebabCase}}", () => {
  it("finds the record its input names", () => {
    const input = get{{namePascalCase}}InputSchema.parse({ id: "1" });

    expect(find{{namePascalCase}}(input).id).toBe("1");
  });

  it("returns what was saved", () => {
    const input = post{{namePascalCase}}InputSchema.parse({
      id: "1",
      title: "Title",
    });

    expect(save{{namePascalCase}}(input)).toStrictEqual(input);
  });
});
