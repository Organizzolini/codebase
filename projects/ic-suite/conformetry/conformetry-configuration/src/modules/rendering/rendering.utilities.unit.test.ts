import { describe, expect, it } from "vitest";

import {
  capturePlaceholderValues,
  createPlaceholderValue,
} from "./rendering.utilities";

describe("rendering utilities", () => {
  describe(createPlaceholderValue, () => {
    it("creates a distinct identifier-safe value each time", () => {
      const first = createPlaceholderValue();

      expect(first).toMatch(/^[a-z][0-9a-z]+$/);
      expect(createPlaceholderValue()).not.toBe(first);
    });
  });

  describe(capturePlaceholderValues, () => {
    const value = createPlaceholderValue();

    it("captures what a placeholder value stands for", () => {
      expect(
        capturePlaceholderValues({
          instanceText: "/word/$id",
          templateText: value,
        }),
      ).toStrictEqual({ [value]: "/word/$id" });
    });

    it("matches the literal text around a value exactly", () => {
      expect(
        capturePlaceholderValues({
          instanceText: "GenerateCommand",
          templateText: `${value}Command`,
        }),
      ).toStrictEqual({ [value]: "Generate" });
      expect(
        capturePlaceholderValues({
          instanceText: "GenerateService",
          templateText: `${value}Command`,
        }),
      ).toBeUndefined();
    });

    it("never captures an empty value", () => {
      expect(
        capturePlaceholderValues({
          instanceText: "Command",
          templateText: `${value}Command`,
        }),
      ).toBeUndefined();
    });

    it("captures nothing from text holding no placeholder value", () => {
      expect(
        capturePlaceholderValues({
          instanceText: "alpha",
          templateText: "alpha",
        }),
      ).toBeUndefined();
    });
  });
});
