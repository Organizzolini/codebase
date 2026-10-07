import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { {{namePascalCase}} } from "./{{nameKebabCase}}";

describe({{namePascalCase}}, () => {
  it("applies its class name", () => {
    render(<{{namePascalCase}} className="{{nameKebabCase}}" />);

    expect(screen.getByTestId("{{nameKebabCase}}").className).toBe(
      "{{nameKebabCase}}",
    );
  });
});
