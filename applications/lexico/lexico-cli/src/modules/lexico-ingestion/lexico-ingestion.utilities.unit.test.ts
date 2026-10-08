import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockStandardInputTerminal } from "../../../testing/mocks";

import { NO_SELECTION_CHOICE } from "./lexico-ingestion.constants";
import {
  getOptionText,
  requireChoice,
  selectChoice,
} from "./lexico-ingestion.utilities";

const { promptsMock } = vi.hoisted(() => ({
  promptsMock:
    vi.fn<
      (question: {
        choices: { title: string; value: string }[];
      }) => Promise<Record<string, unknown>>
    >(),
}));

vi.mock("prompts", () => ({
  default: promptsMock,
}));

const choices = [
  { title: "perseus", value: "perseus" },
  { title: "thelatinlibrary", value: "thelatinlibrary" },
];

describe("lexico-ingestion utilities", () => {
  describe(getOptionText, () => {
    it.each([
      ["a given value, trimmed", " ovid ", "ovid"],
      ["an empty value", "", undefined],
      ["a bare flag", true, undefined],
      ["an omitted flag", undefined, undefined],
    ] as const)("reads %s", (_name, value, expected) => {
      expect(getOptionText(value)).toBe(expected);
    });
  });

  describe(requireChoice, () => {
    it("returns a value that is one of the choices", () => {
      expect(requireChoice("perseus", choices, "missing")).toBe("perseus");
    });

    it("throws the given message for a value outside the choices", () => {
      expect(() =>
        requireChoice("nope", choices, 'Provider "nope" not found.'),
      ).toThrow('Provider "nope" not found.');
    });
  });

  describe(selectChoice, () => {
    const setStandardInputTerminal = mockStandardInputTerminal();
    const question = {
      choices,
      message: "Select the provider",
      noSelectionTitle: "All",
    };

    beforeEach(() => {
      promptsMock.mockReset();
      setStandardInputTerminal(true);
    });

    it("takes no selection without prompting when standard input is not a terminal", async () => {
      setStandardInputTerminal(false);

      await expect(selectChoice(question)).resolves.toBeUndefined();
      expect(promptsMock).not.toHaveBeenCalled();
    });

    it("returns the picked choice", async () => {
      promptsMock.mockResolvedValueOnce({ choice: "thelatinlibrary" });

      await expect(selectChoice(question)).resolves.toBe("thelatinlibrary");
    });

    it("returns no selection, not its title, when the leading entry is picked", async () => {
      promptsMock.mockResolvedValueOnce({ choice: NO_SELECTION_CHOICE });

      await expect(selectChoice(question)).resolves.toBeUndefined();
      expect(promptsMock.mock.calls[0]?.[0].choices[0]).toStrictEqual({
        title: "All",
        value: NO_SELECTION_CHOICE,
      });
    });

    it("throws when the prompt is cancelled", async () => {
      promptsMock.mockResolvedValueOnce({});

      await expect(selectChoice(question)).rejects.toThrow(
        "Prompt cancelled: Select the provider",
      );
    });
  });
});
