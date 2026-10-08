import { describe, expect, it } from "vitest";

import {
  cleanBoilerplate,
  formatLineNumber,
  hasValidTextContent,
  isEnglishBoilerplate,
} from "./library.utilities";

describe("library.utilities", () => {
  describe(cleanBoilerplate, () => {
    it("removes known boilerplate phrases and trims whitespace", () => {
      const text =
        "  The Latin Library text from The Classics Page Neo-Latin  ";

      const cleanedText = cleanBoilerplate(text);

      expect(cleanedText).toBe("text from");
    });

    it("returns original text when no boilerplate exists", () => {
      const text = "sample text line";

      const cleanedText = cleanBoilerplate(text);

      expect(cleanedText).toBe("sample text line");
    });
  });

  describe(formatLineNumber, () => {
    it("moves end-of-line number to the front in bold", () => {
      const formattedLine = formatLineNumber("sample text line   42");

      expect(formattedLine).toBe("**42** sample text line");
    });

    it("formats bracketed prefixes", () => {
      const formattedLine = formatLineNumber("[IV] text");

      expect(formattedLine).toBe("**[IV]** text");
    });

    it("formats decimal prefixes", () => {
      const formattedLine = formatLineNumber("1.2.3. sentence");

      expect(formattedLine).toBe("**1.2.3.** sentence");
    });

    it("formats simple numeric prefixes", () => {
      const formattedLine = formatLineNumber("12 words");

      expect(formattedLine).toBe("**12** words");
    });

    it("formats roman numeral prefixes", () => {
      const formattedLine = formatLineNumber("XII sentence");

      expect(formattedLine).toBe("**XII** sentence");
    });

    it("keeps existing bold prefix unchanged", () => {
      const formattedLine = formatLineNumber("**12** words");

      expect(formattedLine).toBe("**12** words");
    });

    it("moves bolded end number to the front", () => {
      const formattedLine = formatLineNumber("versus  **17**");

      expect(formattedLine).toBe("**17** versus");
    });
  });

  describe(hasValidTextContent, () => {
    it("returns false for empty paragraph list", () => {
      const validTextContent = hasValidTextContent([]);

      expect(validTextContent).toBe(false);
    });

    it("returns false when no alphabetical characters exist", () => {
      const validTextContent = hasValidTextContent(["123", "--", "456"]);

      expect(validTextContent).toBe(false);
    });

    it("returns true when alphabetical characters are present", () => {
      const validTextContent = hasValidTextContent(["123", "word", "456"]);

      expect(validTextContent).toBe(true);
    });
  });

  describe(isEnglishBoilerplate, () => {
    it("returns false when line has no words", () => {
      const englishBoilerplate = isEnglishBoilerplate("123 --");

      expect(englishBoilerplate).toBe(false);
    });

    it("returns true when stop word count is at least three", () => {
      const englishBoilerplate = isEnglishBoilerplate("the and of");

      expect(englishBoilerplate).toBe(true);
    });

    it("returns true for long lines with high stop-word ratio", () => {
      const englishBoilerplate = isEnglishBoilerplate(
        "the source and text by author with context",
      );

      expect(englishBoilerplate).toBe(true);
    });

    it("returns false for latin-like content", () => {
      const englishBoilerplate = isEnglishBoilerplate(
        "alpha beta gamma delta epsilon zeta",
      );

      expect(englishBoilerplate).toBe(false);
    });
  });
});
