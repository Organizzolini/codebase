import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PronunciationClassicalService } from "./pronunciation-classical.service";

describe(PronunciationClassicalService, () => {
  let service: PronunciationClassicalService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PronunciationClassicalService],
    }).compile();

    service = await module.resolve(PronunciationClassicalService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("processClassicalCharacter", () => {
    it("should classify initial h as H", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "h",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["h", "o", "r", "a"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("H");
    });

    it("should not add H for h after r before vowel", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "h",
        index: 2,
        isVowel: (index) => index === 3,
        phonemes,
        word: ["a", "r", "h", "a"],
      });

      expect(nextIndex).toBe(2);
      expect(phonemes).toStrictEqual([]);
    });

    it("should return the same index for a single default character", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "a",
        index: 0,
        isVowel: () => true,
        phonemes,
        word: ["a"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes.length).toBeGreaterThan(0);
    });

    it("should classify i as J when followed by vowel at start", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "i",
        index: 0,
        isVowel: (index) => index === 1,
        phonemes,
        word: ["i", "a"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("J");
    });

    it("should classify i as I when not vocalic", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "i",
        index: 1,
        isVowel: () => false,
        phonemes,
        word: ["p", "i", "x"],
      });

      expect(nextIndex).toBe(1);
      expect(phonemes).toContain("I");
    });

    it("should classify i as J when surrounded by vowels", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "i",
        index: 1,
        isVowel: (index) => index === 0 || index === 2,
        phonemes,
        word: ["a", "i", "a"],
      });

      expect(nextIndex).toBe(1);
      expect(phonemes).toContain("J");
    });

    it("should fallback to empty phoneme for unknown i-mapped character", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "?",
        index: 1,
        isVowel: () => false,
        phonemes,
        word: ["a", "?", "b"],
      });

      expect(nextIndex).toBe(1);
      expect(phonemes).toStrictEqual([""]);
    });

    it("should classify j as I after certain consonants", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "j",
        index: 1,
        isVowel: () => false,
        phonemes,
        word: ["n", "j", "a"],
      });

      expect(nextIndex).toBe(1);
      expect(phonemes).toContain("I");
    });

    it("should classify j as J when previous consonant is not special", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "j",
        index: 1,
        isVowel: () => false,
        phonemes,
        word: ["b", "j", "a"],
      });

      expect(nextIndex).toBe(1);
      expect(phonemes).toContain("J");
    });

    it("should classify j at index zero using fallback mapping", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "j",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["j"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("J");
    });

    it("should classify n as NG before c", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "n",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["n", "c"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("NG");
    });

    it("should classify n as N when not followed by hard consonant", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "n",
        index: 0,
        isVowel: () => true,
        phonemes,
        word: ["n", "a"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("N");
    });

    it("should classify n at word end as N", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "n",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["n"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("N");
    });

    it("should devocalize b before s", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "b",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["b", "s"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("p");
    });

    it("should not devocalize b when next character is not devoicing target", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "b",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["b", "a"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toContain("B");
    });

    it("should fallback to empty phoneme for unknown default character", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "?",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["?"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toStrictEqual([""]);
    });

    it("should use one-character lookup for digraphs", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "q",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["q", "u", "i"],
      });

      expect(nextIndex).toBeGreaterThanOrEqual(0);
      expect(phonemes).toHaveLength(1);
    });

    it("should use one-character map for ae and advance index", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "a",
        index: 0,
        isVowel: () => true,
        phonemes,
        word: ["a", "e", "t"],
      });

      expect(nextIndex).toBe(1);
      expect(phonemes).toContain("AE");
    });

    it("should use default lookup when no multi-character phoneme exists", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "z",
        index: 0,
        isVowel: () => false,
        phonemes,
        word: ["z"],
      });

      expect(nextIndex).toBe(0);
      expect(phonemes).toHaveLength(1);
    });

    it("should use one-character lookup branch when two-character lookahead is unavailable", () => {
      const phonemes: string[] = [];

      const nextIndex = service.processClassicalCharacter({
        ch: "a",
        index: 0,
        isVowel: () => true,
        phonemes,
        word: ["a", "e"],
      });

      expect(nextIndex).toBe(1);
      expect(phonemes).toContain("AE");
    });
  });

  describe("private classifier fallbacks", () => {
    it("should fallback to empty phoneme for unknown private i classification", () => {
      const phonemes: string[] = [];

      (
        service as unknown as {
          classifyClassicalI: (args: {
            ch: string;
            index: number;
            isVowel: (index: number) => boolean;
            phonemes: string[];
            word: string[];
          }) => void;
        }
      ).classifyClassicalI({
        ch: "?",
        index: 1,
        isVowel: () => false,
        phonemes,
        word: ["a", "?", "b"],
      });

      expect(phonemes).toStrictEqual([""]);
    });

    it("should fallback to empty phoneme for unknown private j classification", () => {
      const phonemes: string[] = [];

      (
        service as unknown as {
          classifyClassicalJ: (args: {
            ch: string;
            index: number;
            isVowel: (index: number) => boolean;
            phonemes: string[];
            word: string[];
          }) => void;
        }
      ).classifyClassicalJ({
        ch: "?",
        index: 1,
        isVowel: () => true,
        phonemes,
        word: ["a", "?", "a"],
      });

      expect(phonemes).toStrictEqual([""]);
    });

    it("should fallback to empty phoneme for unknown private n classification", () => {
      const phonemes: string[] = [];

      (
        service as unknown as {
          classifyClassicalN: (args: {
            ch: string;
            index: number;
            isVowel: (index: number) => boolean;
            phonemes: string[];
            word: string[];
          }) => void;
        }
      ).classifyClassicalN({
        ch: "?",
        index: 0,
        isVowel: () => true,
        phonemes,
        word: ["?", "a"],
      });

      expect(phonemes).toStrictEqual([""]);
    });

    it("should fallback to empty phoneme for unknown private devocalize character", () => {
      const phonemes: string[] = [];

      (
        service as unknown as {
          lookupClassicalDevocalizeCharacter: (args: {
            ch: string;
            index: number;
            phonemes: string[];
            word: string[];
          }) => void;
        }
      ).lookupClassicalDevocalizeCharacter({
        ch: "?",
        index: 0,
        phonemes,
        word: ["?", "s"],
      });

      expect(phonemes).toStrictEqual([""]);
    });

    it("should fallback to empty phoneme in private devocalize else path", () => {
      const phonemes: string[] = [];

      (
        service as unknown as {
          lookupClassicalDevocalizeCharacter: (args: {
            ch: string;
            index: number;
            phonemes: string[];
            word: string[];
          }) => void;
        }
      ).lookupClassicalDevocalizeCharacter({
        ch: "?",
        index: 0,
        phonemes,
        word: ["?", "a"],
      });

      expect(phonemes).toStrictEqual([""]);
    });
  });
});
