import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { {{nameCamelCase}} } from "./{{nameKebabCase}}";

describe({{nameCamelCase}}, () => {
  it("returns its value", () => {
    const { result } = renderHook(() => {{nameCamelCase}}());

    expect(result.current).toBe(false);
  });
});
