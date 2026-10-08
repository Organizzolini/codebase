import { describe, expect, it } from "vitest";

import { BIGINT_NUMBER_TRANSFORMER } from "./entities.constants";

describe("bIGINT_NUMBER_TRANSFORMER", () => {
  it("reads the string Postgres returns for a bigint as a number, and keeps null", () => {
    expect(BIGINT_NUMBER_TRANSFORMER.from("42")).toBe(42);
    expect(BIGINT_NUMBER_TRANSFORMER.from(7)).toBe(7);
    expect(BIGINT_NUMBER_TRANSFORMER.from(null)).toBeNull();
  });

  it("writes a value through untouched", () => {
    const operator = { type: "in", value: [1, 2] };

    expect(BIGINT_NUMBER_TRANSFORMER.to(3)).toBe(3);
    expect(BIGINT_NUMBER_TRANSFORMER.to(operator)).toBe(operator);
  });
});
